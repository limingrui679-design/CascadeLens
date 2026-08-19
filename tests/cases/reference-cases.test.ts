import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildReferenceCase,
  capabilityCatalog,
  caseCatalogRecord,
  referenceCaseSpecs,
} from "../../packages/cases/src/index";
import { stableStringify } from "../../packages/core/src/index";

test("builds sixteen deterministic, bounded, scenario-only reference cases", async () => {
  assert.equal(referenceCaseSpecs.length, 16);
  const currentCatalog = JSON.parse(
    await readFile(new URL("../../content/cases/catalog.json", import.meta.url), "utf8"),
  ) as {
    cases: unknown[];
    historicallyScoredCaseCount: number;
    structuralCoverage: {
      topologyProfiles: string[];
      horizonProfiles: string[];
      dynamicEdgeCaseCount: number;
      cycleCaseCount: number;
    };
  };
  const rebuilt = [];
  const coveredCapabilities = new Set<string>();
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
    assert.ok(built.spec.decisionProfile.stakeholders.length >= 3);
    assert.ok(built.spec.decisionProfile.userTasks.length >= 3);
    for (const capability of built.spec.decisionProfile.capabilities) {
      coveredCapabilities.add(capability);
    }
  }
  assert.equal(currentCatalog.historicallyScoredCaseCount, 0);
  assert.ok(currentCatalog.structuralCoverage.topologyProfiles.length >= 5);
  assert.ok(currentCatalog.structuralCoverage.horizonProfiles.length >= 4);
  assert.ok(currentCatalog.structuralCoverage.dynamicEdgeCaseCount >= 2);
  assert.ok(currentCatalog.structuralCoverage.cycleCaseCount >= 1);
  assert.deepEqual(
    [...coveredCapabilities].sort(),
    capabilityCatalog.map((item) => item.id).sort(),
  );
  assert.equal(stableStringify(rebuilt), stableStringify(currentCatalog.cases));
});
