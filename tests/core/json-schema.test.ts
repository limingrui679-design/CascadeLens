import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  ENGINE_VERSION,
  analyzeInterventions,
  createRiskPack,
  runCascadeBounds,
  scoreReplay,
} from "../../packages/core/src/index";
import { graphSnapshot, scenario } from "./fixtures";

async function schema(name: string): Promise<object> {
  return JSON.parse(
    await readFile(new URL(`../../schemas/${name}`, import.meta.url), "utf8"),
  ) as object;
}

function validator(document: object) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(document);
}

test("published schemas validate live core artifacts", async () => {
  const snapshot = await graphSnapshot();
  const shock = scenario();
  const bounds = await runCascadeBounds(snapshot, shock);
  const interventions = await analyzeInterventions(snapshot, shock);
  const benchmark = scoreReplay(snapshot, shock, bounds, []);
  const pack = await createRiskPack({
    packId: "pack:schema-fixture",
    generatedAt: "2026-08-12T00:00:00Z",
    snapshot,
    scenario: shock,
    bounds,
    interventionAnalysis: interventions,
    benchmark,
    assumptions: {
      scenarioId: shock.scenarioId,
      generatedAt: shock.decisionCutoff,
      status: "scenario_parameters_not_observations",
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
      validationStatus: "software_verified_empirically_unvalidated",
      limitations: ["Fixture only."],
    },
    observationValues: [],
    rebuildCommand: "npm test",
  });
  const shockValidator = validator(await schema("shockscript-0.1.0.schema.json"));
  const graphValidator = validator(await schema("worldgraph-0.1.0.schema.json"));
  const manifestValidator = validator(await schema("riskpack-manifest-0.1.0.schema.json"));
  assert.equal(shockValidator(shock), true, JSON.stringify(shockValidator.errors));
  assert.equal(graphValidator(snapshot), true, JSON.stringify(graphValidator.errors));
  assert.equal(manifestValidator(pack.manifest), true, JSON.stringify(manifestValidator.errors));
});

test("ShockScript schema rejects unknown fields and incomplete bounds", async () => {
  const validate = validator(await schema("shockscript-0.1.0.schema.json"));
  const value = { ...scenario(), inventedClaim: true } as Record<string, unknown>;
  assert.equal(validate(value), false);
  const second = scenario();
  second.propagation.bounds = ["lower"];
  assert.equal(validate(second), false);
});
