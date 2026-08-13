import assert from "node:assert/strict";
import test from "node:test";
import {
  compareCanonicalStrings,
  createRiskPack,
  sha256Text,
  stableStringify,
  verifyRiskPack,
  verifyRiskPackDetailed,
  type CascadeBounds,
} from "../../packages/core/src/index";
import { riskPackFixtureInputs } from "./riskpack-fixture";

async function fixturePack() {
  const input = await riskPackFixtureInputs();
  return {
    input,
    pack: await createRiskPack({
      packId: "riskpack:suez-fixture",
      generatedAt: "2021-05-02T00:00:00Z",
      ...input,
    }),
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
  const { pack } = await fixturePack();
  assert.deepEqual(await verifyRiskPack(pack), []);
  assert.equal(pack.files["checksums.sha256"].includes("/Users/"), false);
});

test("detects a tampered RiskPack payload", async () => {
  const { pack } = await fixturePack();
  pack.files["limitations.json"] += "tampered";
  assert.ok((await verifyRiskPack(pack)).includes("checksum_mismatch:limitations.json"));
});

test("rejects a self-consistently rehashed pack with missing horizon evidence", async () => {
  const { pack } = await fixturePack();
  const altered = JSON.parse(pack.files["results/cascade-bounds.json"]) as CascadeBounds;
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
  const { pack } = await fixturePack();
  const altered = JSON.parse(
    pack.files["results/cascade-bounds.json"],
  ) as CascadeBounds;
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
  const { pack } = await fixturePack();
  const baseline = await verifyRiskPackDetailed(pack);
  assert.equal(baseline.status, "recomputed");
  const matched = await verifyRiskPackDetailed(pack, baseline.packDigest);
  assert.equal(matched.expectedDigestMatched, true);
  const mismatched = await verifyRiskPackDetailed(pack, "f".repeat(64));
  assert.equal(mismatched.status, "invalid");
  assert.ok(mismatched.issues.includes("external_pack_digest_mismatch"));
});

test("rejects self-rehashed model-card validation-status tampering", async () => {
  const { pack } = await fixturePack();
  const card = JSON.parse(pack.files["model-card.json"]) as {
    validationStatus: string;
  };
  card.validationStatus = "historically_scored";
  pack.files["model-card.json"] = `${stableStringify(card, 2)}\n`;
  await rehash(pack, "model-card.json");
  assert.ok((await verifyRiskPack(pack)).includes("model_card_semantic_mismatch"));
});

test("rejects self-rehashed model-card limitation removal", async () => {
  const { pack } = await fixturePack();
  const card = JSON.parse(pack.files["model-card.json"]) as {
    limitations: string[];
  };
  card.limitations = card.limitations.slice(1);
  pack.files["model-card.json"] = `${stableStringify(card, 2)}\n`;
  await rehash(pack, "model-card.json");
  assert.ok((await verifyRiskPack(pack)).includes("model_card_semantic_mismatch"));
});

test("rejects self-rehashed assumption-value tampering", async () => {
  const { pack } = await fixturePack();
  const register = JSON.parse(pack.files["assumptions.json"]) as {
    assumptions: Array<{ value: number }>;
  };
  register.assumptions[0].value -= 0.1;
  pack.files["assumptions.json"] = `${stableStringify(register, 2)}\n`;
  await rehash(pack, "assumptions.json");
  const issues = await verifyRiskPack(pack);
  assert.ok(issues.some((issue) => issue.startsWith("assumption_value_binding_mismatch:")));
  assert.ok(issues.includes("assumption_artifact_digest_mismatch"));
});

test("rejects self-rehashed limitations removal", async () => {
  const { pack } = await fixturePack();
  const limitations = JSON.parse(pack.files["limitations.json"]) as {
    scenarioLimitations: string[];
  };
  limitations.scenarioLimitations = [];
  pack.files["limitations.json"] = `${stableStringify(limitations, 2)}\n`;
  await rehash(pack, "limitations.json");
  const issues = await verifyRiskPack(pack);
  assert.ok(issues.includes("limitations_semantic_mismatch"));
});
