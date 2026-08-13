import assert from "node:assert/strict";
import test from "node:test";
import { analyzeInterventions } from "../../packages/core/src/index";
import { graphSnapshot, scenario } from "./fixtures";

test("evaluates the full feasible intervention set and returns a Pareto frontier", async () => {
  const analysis = await analyzeInterventions(await graphSnapshot(), scenario());
  assert.equal(analysis.evaluatedBundles.length, 4);
  assert.ok(analysis.paretoFrontier.length >= 2);
  const baseline = analysis.evaluatedBundles.find((item) => item.interventionIds.length === 0)!;
  assert.equal(baseline.strategy, "do_not_act");
  assert.deepEqual(analysis.baselineBundle, baseline);
  const best = analysis.evaluatedBundles
    .filter(
      (item): item is typeof item & { worstCaseImpact: number } =>
        item.feasible && item.worstCaseImpact !== null,
    )
    .sort((a, b) => a.worstCaseImpact - b.worstCaseImpact)[0];
  assert.ok(baseline.worstCaseImpact !== null);
  assert.ok(best.worstCaseImpact < baseline.worstCaseImpact);
  assert.equal(analysis.recommendationStatus, "eligible");
});

test("blocks intervention bundles that exceed an explicit budget", async () => {
  const constrained = scenario();
  constrained.constraints.budget = 5;
  const analysis = await analyzeInterventions(await graphSnapshot(), constrained);
  assert.equal(
    analysis.evaluatedBundles.filter((item) => item.feasible).length,
    1,
  );
  const blocked = analysis.evaluatedBundles.find((item) => !item.feasible);
  assert.ok(blocked);
  assert.equal(blocked.worstCaseImpact, null);
  assert.doesNotThrow(() => JSON.stringify(analysis));
});
