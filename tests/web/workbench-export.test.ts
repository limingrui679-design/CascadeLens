import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkbenchExport } from "../../app/workbench/export";
import {
  analyzeInterventions,
  runCascadeBounds,
} from "../../packages/core/src/index";
import { graphSnapshot, scenario } from "../core/fixtures";

test("builds a complete, parseable, truthfully labelled workbench export", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  activeScenario.scenarioId = "scenario:unsafe/path";
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const interventions = await analyzeInterventions(snapshot, activeScenario);
  const artifact = buildWorkbenchExport({
    scenario: activeScenario,
    snapshot,
    bounds,
    interventions,
  });
  assert.equal(artifact.filename, "scenario-unsafe-path-analysis.json");
  assert.equal(artifact.mediaType, "application/json");
  assert.equal(artifact.text.endsWith("\n"), true);
  const payload = JSON.parse(artifact.text) as Record<string, unknown>;
  assert.equal(payload.status, "scenario_output_not_empirical_validation");
  assert.equal(payload.snapshotDigest, snapshot.contentDigest);
  assert.deepEqual(payload.bounds, bounds);
  assert.deepEqual(payload.interventions, interventions);
  assert.match(String(payload.disclaimer), /not a forecast/);
});
