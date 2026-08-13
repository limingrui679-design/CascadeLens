import assert from "node:assert/strict";
import test from "node:test";
import { runCascadeBounds, scoreReplay } from "../../packages/core/src/index";
import { graphSnapshot, scenario } from "./fixtures";

const completeSevenDayOutcome = {
  targetMetric: "time_weighted_mean_node_impact" as const,
  horizonDays: 7,
  windowStart: "2021-03-23T00:00:00Z",
  windowEnd: "2021-03-30T00:00:00Z",
  availableAt: "2021-04-30T00:00:00Z",
};

test("scores separated post-event outcomes", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const benchmark = scoreReplay(snapshot, activeScenario, bounds, [
    {
      nodeId: "product:medical",
      observedImpact: 0.5,
      sourceId: "src:outcome",
      ...completeSevenDayOutcome,
    },
    {
      nodeId: "industry:hospital",
      observedImpact: 0.2,
      sourceId: "src:outcome",
      ...completeSevenDayOutcome,
    },
    {
      nodeId: "region:downstream",
      observedImpact: 0.1,
      sourceId: "src:outcome",
      ...completeSevenDayOutcome,
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
      sourceId: "src:official",
      ...completeSevenDayOutcome,
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
      sourceId: "src:outcome",
      ...completeSevenDayOutcome,
      availableAt: "not-a-date",
    },
    {
      nodeId: "product:medical",
      observedImpact: 0.3,
      sourceId: "src:outcome",
      ...completeSevenDayOutcome,
    },
    {
      nodeId: "product:medical",
      observedImpact: 0.4,
      sourceId: "src:outcome",
      ...completeSevenDayOutcome,
    },
  ]);
  assert.equal(benchmark.status, "blocked");
  assert.ok(benchmark.leakageIssues.some((item) => item.includes("unknown node missing:node")));
  assert.ok(benchmark.leakageIssues.some((item) => item.includes("availableAt must be")));
  assert.ok(benchmark.leakageIssues.some((item) => item.includes("duplicate outcome target")));
});

test("blocks pre-shock, incomplete-window, unavailable, wrong-metric, and wrong-horizon outcomes", async () => {
  const snapshot = await graphSnapshot();
  const activeScenario = scenario();
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const base = {
    nodeId: "product:medical",
    observedImpact: 0.2,
    sourceId: "src:outcome",
    ...completeSevenDayOutcome,
  };
  const invalid = [
    { ...base, windowStart: "2021-03-22T00:00:00Z" },
    { ...base, windowEnd: "2021-03-25T00:00:00Z" },
    { ...base, availableAt: "2021-03-29T00:00:00Z" },
    { ...base, targetMetric: "unsupported_metric" as never },
    { ...base, horizonDays: 14 },
  ];
  for (const outcome of invalid) {
    const result = scoreReplay(snapshot, activeScenario, bounds, [outcome]);
    assert.equal(result.status, "blocked");
    assert.ok(result.leakageIssues.length > 0);
  }
});
