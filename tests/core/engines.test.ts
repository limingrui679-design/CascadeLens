import assert from "node:assert/strict";
import test from "node:test";
import {
  ENGINE_VERSION,
  EngineRegistry,
  auditFlowConservation,
  runCascade,
  sealSnapshot,
} from "../../packages/core/src/index";
import { graphDraft, graphSnapshot, scenario } from "./fixtures";

test("dispatches the built-in engine through a registry", async () => {
  const registry = new EngineRegistry();
  assert.deepEqual(registry.list(), [{ id: "dependency_cascade", version: ENGINE_VERSION }]);
  const result = await registry.run(await graphSnapshot(), scenario(), "central");
  assert.equal(result.bound, "central");
  assert.equal(result.horizonDays, 90);
});

test("fails closed for an unregistered engine", async () => {
  const registry = new EngineRegistry(false);
  await assert.rejects(
    registry.run(await graphSnapshot(), scenario(), "central"),
    /not registered/,
  );
});

test("audits incoming dependency shares without mutating the graph", async () => {
  const draft = graphDraft();
  draft.edges.push({
    ...draft.edges[0],
    id: "edge:duplicate-share",
    from: "region:downstream",
    to: "product:medical",
    weight: { value: 0.7, lower: 0.7, upper: 0.7, unit: "share" },
  });
  const snapshot = await sealSnapshot(draft);
  const issues = auditFlowConservation(snapshot, "lower");
  assert.equal(issues[0].nodeId, "product:medical");
  assert.ok(Math.abs(issues[0].incomingShare - 1.1) < 1e-12);
});

test("supports explicit edge-target shocks", async () => {
  const value = scenario();
  value.shocks[0].target = { edgeIds: ["edge:route-product"] };
  const result = await runCascade(await graphSnapshot(), value, "central");
  const medical = result.impacts.find((item) => item.nodeId === "product:medical");
  assert.ok(medical && medical.directImpact > 0);
});

test("combines simultaneous shocks monotonically", async () => {
  const one = scenario();
  const two = scenario();
  two.shocks.push({
    ...two.shocks[0],
    id: "shock:medical-demand",
    label: "Medical demand pressure",
    target: { ids: ["product:medical"] },
    operation: "increase_demand",
    magnitude: 0.5,
  });
  const snapshot = await graphSnapshot();
  const [oneResult, twoResult] = await Promise.all([
    runCascade(snapshot, one, "central"),
    runCascade(snapshot, two, "central"),
  ]);
  assert.ok(twoResult.totalWeightedImpact >= oneResult.totalWeightedImpact);
});
