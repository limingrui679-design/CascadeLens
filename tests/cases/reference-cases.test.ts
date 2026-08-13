import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildReferenceCase,
  caseCatalogRecord,
  referenceCaseSpecs,
} from "../../packages/cases/src/index";
import { stableStringify } from "../../packages/core/src/index";

test("builds twelve deterministic, bounded, scenario-only reference cases", async () => {
  assert.equal(referenceCaseSpecs.length, 12);
  const currentCatalog = JSON.parse(
    await readFile(new URL("../../content/cases/catalog.json", import.meta.url), "utf8"),
  ) as { cases: unknown[]; historicallyScoredCaseCount: number };
  const rebuilt = [];
  for (const spec of referenceCaseSpecs) {
    const built = await buildReferenceCase(spec);
    rebuilt.push(caseCatalogRecord(built));
    assert.deepEqual(built.verificationIssues, []);
    assert.equal(built.benchmark.status, "scenario_only");
    assert.equal(built.benchmark.sampleSize, 0);
    assert.ok(built.bounds.lower.totalWeightedImpact <= built.bounds.central.totalWeightedImpact);
    assert.ok(built.bounds.central.totalWeightedImpact <= built.bounds.upper.totalWeightedImpact);
    assert.ok(Number.isFinite(built.bounds.upper.totalWeightedImpact));
    assert.ok(built.snapshot.nodes.every((item) => item.evidence.grade === "MODEL_INFERRED"));
    assert.ok(built.snapshot.edges.every((item) => item.evidence.grade === "MODEL_INFERRED"));
    assert.equal(built.snapshot.sources.find((item) => item.id.endsWith(":context"))?.artifactKind, "citation_record");
    assert.doesNotMatch(built.riskPack.files["REBUILD.txt"], /\/(?:Users|home)\//);
  }
  assert.equal(currentCatalog.historicallyScoredCaseCount, 0);
  assert.equal(stableStringify(rebuilt), stableStringify(currentCatalog.cases));
});
