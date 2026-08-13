import assert from "node:assert/strict";
import test from "node:test";
import {
  ENGINE_VERSION,
  analyzeInterventions,
  compareCanonicalStrings,
  createRiskPack,
  runCascadeBounds,
  scoreReplay,
  sha256Text,
  stableStringify,
  verifyRiskPack,
  verifyRiskPackDetailed,
} from "../../packages/core/src/index";
import { graphSnapshot, scenario } from "./fixtures";

function supplemental(activeScenario: ReturnType<typeof scenario>) {
  return {
    assumptions: {
      scenarioId: activeScenario.scenarioId,
      generatedAt: activeScenario.decisionCutoff,
      status: "scenario_parameters_not_observations" as const,
      assumptions: [],
      disclaimer: "Fixture assumptions are not observations.",
    },
    modelCard: {
      modelId: "dependency_cascade",
      version: ENGINE_VERSION,
      intendedUse: ["Software verification"],
      outOfScope: ["Real-world decisions"],
      algorithm: "Deterministic dependency propagation.",
      evidencePolicy: "Inferred edges remain bounded.",
      validationStatus: "software_verified_empirically_unvalidated" as const,
      limitations: ["Fixture only."],
    },
    observationValues: [],
    rebuildCommand: `npm run cascadelens -- cases build ${activeScenario.scenarioId}`,
  };
}

async function rehash(
  pack: Awaited<ReturnType<typeof createRiskPack>>,
  path: string,
): Promise<void> {
  pack.checksums[path] = await sha256Text(pack.files[path]);
  pack.files["checksums.sha256"] = Object.entries(pack.checksums)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([name, digest]) => `${digest}  ${name}`)
    .join("\n") + "\n";
}

test("creates and verifies a complete RiskPack", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const interventions = await analyzeInterventions(snapshot, activeScenario);
  const benchmark = scoreReplay(snapshot, activeScenario, bounds, []);
  const pack = await createRiskPack({
    packId: "riskpack:suez-fixture",
    generatedAt: "2021-05-02T00:00:00Z",
    snapshot,
    scenario: activeScenario,
    bounds,
    interventionAnalysis: interventions,
    benchmark,
    ...supplemental(activeScenario),
  });
  assert.deepEqual(await verifyRiskPack(pack), []);
  assert.equal(pack.files["checksums.sha256"].includes("/Users/"), false);
});

test("detects a tampered RiskPack payload", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const pack = await createRiskPack({
    packId: "riskpack:suez-fixture",
    generatedAt: "2021-05-02T00:00:00Z",
    snapshot,
    scenario: activeScenario,
    bounds,
    interventionAnalysis: await analyzeInterventions(snapshot, activeScenario),
    benchmark: scoreReplay(snapshot, activeScenario, bounds, []),
    ...supplemental(activeScenario),
  });
  pack.files["limitations.json"] += "tampered";
  assert.ok((await verifyRiskPack(pack)).includes("checksum_mismatch:limitations.json"));
});

test("rejects a self-consistently rehashed pack with missing horizon evidence", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const pack = await createRiskPack({
    packId: "riskpack:suez-fixture",
    generatedAt: "2021-05-02T00:00:00Z",
    snapshot,
    scenario: activeScenario,
    bounds,
    interventionAnalysis: await analyzeInterventions(snapshot, activeScenario),
    benchmark: scoreReplay(snapshot, activeScenario, bounds, []),
    ...supplemental(activeScenario),
  });
  const altered = JSON.parse(pack.files["results/cascade-bounds.json"]) as typeof bounds;
  altered.horizons = altered.horizons.slice(1);
  pack.files["results/cascade-bounds.json"] = `${JSON.stringify(altered, null, 2)}\n`;
  pack.checksums["results/cascade-bounds.json"] = await sha256Text(
    pack.files["results/cascade-bounds.json"],
  );
  pack.files["checksums.sha256"] = Object.entries(pack.checksums)
    .sort(([left], [right]) => compareCanonicalStrings(left, right))
    .map(([path, digest]) => `${digest}  ${path}`)
    .join("\n") + "\n";
  assert.ok((await verifyRiskPack(pack)).includes("cascade_horizon_set_mismatch"));
});

test("rejects derived-result tampering even when every internal checksum is refreshed", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const pack = await createRiskPack({
    packId: "riskpack:suez-fixture",
    generatedAt: "2021-05-02T00:00:00Z",
    snapshot,
    scenario: activeScenario,
    bounds,
    interventionAnalysis: await analyzeInterventions(snapshot, activeScenario),
    benchmark: scoreReplay(snapshot, activeScenario, bounds, []),
    ...supplemental(activeScenario),
  });
  const altered = JSON.parse(
    pack.files["results/cascade-bounds.json"],
  ) as typeof bounds;
  altered.upper.totalWeightedImpact = Math.max(
    0,
    altered.upper.totalWeightedImpact - 0.01,
  );
  altered.horizons.at(-1)!.upper.totalWeightedImpact =
    altered.upper.totalWeightedImpact;
  pack.files["results/cascade-bounds.json"] = `${stableStringify(altered, 2)}\n`;
  await rehash(pack, "results/cascade-bounds.json");
  const report = await verifyRiskPackDetailed(pack);
  assert.equal(report.status, "invalid");
  assert.ok(
    report.issues.includes(
      "derived_output_mismatch:results/cascade-bounds.json",
    ),
  );
});

test("supports an external expected digest without confusing it with recomputation", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const pack = await createRiskPack({
    packId: "riskpack:suez-fixture",
    generatedAt: "2021-05-02T00:00:00Z",
    snapshot,
    scenario: activeScenario,
    bounds,
    interventionAnalysis: await analyzeInterventions(snapshot, activeScenario),
    benchmark: scoreReplay(snapshot, activeScenario, bounds, []),
    ...supplemental(activeScenario),
  });
  const baseline = await verifyRiskPackDetailed(pack);
  assert.equal(baseline.status, "recomputed");
  const matched = await verifyRiskPackDetailed(pack, baseline.packDigest);
  assert.equal(matched.expectedDigestMatched, true);
  const mismatched = await verifyRiskPackDetailed(pack, "f".repeat(64));
  assert.equal(mismatched.status, "invalid");
  assert.ok(mismatched.issues.includes("external_pack_digest_mismatch"));
});
