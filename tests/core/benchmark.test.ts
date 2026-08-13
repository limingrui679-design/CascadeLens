import assert from "node:assert/strict";
import test from "node:test";
import { runCascadeBounds, scoreReplay } from "../../packages/core/src/index";
import { graphSnapshot, scenario } from "./fixtures";

test("scores separated post-event outcomes", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const benchmark = scoreReplay(snapshot, activeScenario, bounds, [
    {
      nodeId: "product:medical",
      observedImpact: 0.5,
      observedAt: "2021-04-01T00:00:00Z",
      sourceId: "src:outcome",
    },
    {
      nodeId: "industry:hospital",
      observedImpact: 0.2,
      observedAt: "2021-04-01T00:00:00Z",
      sourceId: "src:outcome",
    },
    {
      nodeId: "region:downstream",
      observedImpact: 0.1,
      observedAt: "2021-04-01T00:00:00Z",
      sourceId: "src:outcome",
    },
  ]);
  assert.equal(benchmark.status, "historically_scored");
  assert.equal(benchmark.sampleSize, 3);
  assert.ok((benchmark.meanAbsoluteError ?? 2) <= 1);
  assert.ok((benchmark.meanIntervalWidth ?? -1) >= 0);
  assert.ok((benchmark.empiricalCoverageCalibrationError ?? -1) >= 0);
  assert.ok(Number.isFinite(benchmark.meanRegretVersusZeroBaseline));
});

test("blocks an outcome that reuses an input source", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const benchmark = scoreReplay(snapshot, activeScenario, bounds, [
    {
      nodeId: "product:medical",
      observedImpact: 0.5,
      observedAt: "2021-04-01T00:00:00Z",
      sourceId: "src:official",
    },
  ]);
  assert.equal(benchmark.status, "blocked");
  assert.ok(benchmark.leakageIssues.some((item) => item.includes("not outcome-only")));
});

test("blocks malformed, unknown, or duplicate outcome observations without throwing", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const benchmark = scoreReplay(snapshot, activeScenario, bounds, [
    {
      nodeId: "missing:node",
      observedImpact: 0.2,
      observedAt: "not-a-date",
      sourceId: "src:outcome",
    },
    {
      nodeId: "product:medical",
      observedImpact: 0.3,
      observedAt: "2021-04-01T00:00:00Z",
      sourceId: "src:outcome",
    },
    {
      nodeId: "product:medical",
      observedImpact: 0.4,
      observedAt: "2021-04-02T00:00:00Z",
      sourceId: "src:outcome",
    },
  ]);
  assert.equal(benchmark.status, "blocked");
  assert.ok(benchmark.leakageIssues.some((item) => item.includes("unknown node missing:node")));
  assert.ok(benchmark.leakageIssues.some((item) => item.includes("observedAt must be")));
  assert.ok(benchmark.leakageIssues.some((item) => item.includes("duplicate outcome node product:medical")));
});
