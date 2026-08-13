import assert from "node:assert/strict";
import test from "node:test";
import {
  runCascadeAtHorizon,
  runCascadeBounds,
  sealSnapshot,
} from "../../packages/core/src/index";
import { graphDraft, graphSnapshot, scenario } from "./fixtures";

test("keeps lower, central, and upper missing-graph impacts monotone", async () => {
  const bounds = await runCascadeBounds(await graphSnapshot(), scenario());
  const lower = new Map(bounds.lower.impacts.map((item) => [item.nodeId, item.impact]));
  const central = new Map(bounds.central.impacts.map((item) => [item.nodeId, item.impact]));
  const upper = new Map(bounds.upper.impacts.map((item) => [item.nodeId, item.impact]));
  for (const nodeId of upper.keys()) {
    assert.ok((lower.get(nodeId) ?? 0) <= (central.get(nodeId) ?? 0));
    assert.ok((central.get(nodeId) ?? 0) <= (upper.get(nodeId) ?? 0));
  }
  assert.equal(lower.get("industry:hospital"), 0);
  assert.ok((central.get("industry:hospital") ?? 0) > 0);
  assert.equal(central.get("region:downstream"), 0);
  assert.ok((upper.get("region:downstream") ?? 0) > 0);
});

test("converges with a directed cycle", async () => {
  const draft = graphDraft();
  draft.edges.push({
    ...draft.edges[0],
    id: "edge:cycle",
    from: "region:downstream",
    to: "product:medical",
    weight: { value: 0.1, lower: 0.05, upper: 0.2, unit: "share" },
  });
  const bounds = await runCascadeBounds(await sealSnapshot(draft), scenario());
  assert.equal(bounds.upper.converged, true);
  assert.ok(bounds.upper.iterations < scenario().propagation.maxIterations);
});

test("computes every requested horizon and activates later shocks only when visible", async () => {
  const activeScenario = scenario();
  activeScenario.shocks[0].endsAt = undefined;
  activeScenario.shocks.push({
    ...activeScenario.shocks[0],
    id: "shock:late-demand",
    label: "Late demand stress",
    target: { ids: ["industry:hospital"] },
    operation: "increase_demand",
    magnitude: 1,
    startsAt: "2021-04-12T00:00:00Z",
  });
  const bounds = await runCascadeBounds(await graphSnapshot(), activeScenario);
  assert.deepEqual(bounds.horizons.map((item) => item.horizonDays), [7, 30, 90]);
  const daySeven = bounds.horizons[0].upper.impacts.find(
    (item) => item.nodeId === "industry:hospital",
  )!;
  const dayThirty = bounds.horizons[1].upper.impacts.find(
    (item) => item.nodeId === "industry:hospital",
  )!;
  assert.ok(dayThirty.impact > daySeven.impact);
  assert.match(bounds.horizons[0].upper.warnings.join(" "), /begins after the 7-day horizon/);
  assert.doesNotMatch(bounds.horizons[1].upper.warnings.join(" "), /shock:late-demand begins after/);
});

test("uses shock end times and reports a peak envelope within the horizon", async () => {
  const snapshot = await graphSnapshot();
  const short = scenario();
  short.propagation.horizonsDays = [90];
  const persistent = scenario();
  persistent.propagation.horizonsDays = [90];
  persistent.shocks[0].endsAt = undefined;
  const shortRun = await runCascadeAtHorizon(snapshot, short, "upper", 90);
  const persistentRun = await runCascadeAtHorizon(snapshot, persistent, "upper", 90);
  const downstream = (result: typeof shortRun) =>
    result.impacts.find((item) => item.nodeId === "region:downstream")!.impact;
  assert.equal(shortRun.metric, "time_weighted_mean_node_impact");
  assert.ok(downstream(persistentRun) > downstream(shortRun));
  const shortDownstream = shortRun.impacts.find(
    (item) => item.nodeId === "region:downstream",
  )!;
  assert.ok(shortDownstream.peakImpact > shortDownstream.impact);
  assert.ok(shortDownstream.endImpact < shortDownstream.peakImpact);
});

test("rejects an invalid explicit horizon", async () => {
  const snapshot = await graphSnapshot();
  await assert.rejects(
    () => runCascadeAtHorizon(snapshot, scenario(), "central", 0),
    /positive integer/,
  );
});
