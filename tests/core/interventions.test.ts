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
  assert.deepEqual(
    analysis.horizonAnalyses.map((item) => item.horizonDays),
    [7, 30, 90],
  );
  assert.ok(
    analysis.evaluatedBundles.every(
      (item) => item.horizonResults.length === 3,
    ),
  );
  assert.equal(analysis.reversalThresholds.length, analysis.paretoFrontier.length - 1);
  for (let index = 0; index < analysis.reversalThresholds.length; index += 1) {
    const threshold = analysis.reversalThresholds[index];
    const from = analysis.paretoFrontier[index];
    const to = analysis.paretoFrontier[index + 1];
    assert.equal(threshold.parameter, "risk_value_per_unit");
    assert.deepEqual(threshold.fromBundleIds, from.interventionIds);
    assert.deepEqual(threshold.toBundleIds, to.interventionIds);
    assert.ok(from.worstCaseImpact !== null);
    assert.ok(to.worstCaseImpact !== null);
    assert.equal(
      threshold.threshold,
      (to.cost - from.cost) / (from.worstCaseImpact - to.worstCaseImpact),
    );
    assert.ok(Number.isFinite(threshold.threshold));
    assert.ok(threshold.threshold > 0);
  }
});

test("activates interventions only after their lead time and reports each horizon", async () => {
  const snapshot = await graphSnapshot();
  const impacts = new Map<number, number[]>();
  for (const leadTimeDays of [0, 7, 14, 59]) {
    const activeScenario = scenario();
    activeScenario.interventions = [
      { ...activeScenario.interventions[0], leadTimeDays },
    ];
    activeScenario.constraints.maxLeadTimeDays = 60;
    const analysis = await analyzeInterventions(snapshot, activeScenario);
    const bundle = analysis.evaluatedBundles.find(
      (item) => item.interventionIds.length === 1,
    )!;
    impacts.set(
      leadTimeDays,
      bundle.horizonResults.map((item) => item.worstCaseImpact!),
    );
    assert.equal(
      bundle.activationSchedule[0].leadTimeDays,
      leadTimeDays,
    );
  }

  const baselineScenario = scenario();
  baselineScenario.interventions = [baselineScenario.interventions[0]];
  const baseline = (await analyzeInterventions(snapshot, baselineScenario)).baselineBundle;
  const baselineByHorizon = baseline.horizonResults.map(
    (item) => item.worstCaseImpact!,
  );
  assert.deepEqual(impacts.get(7)![0], baselineByHorizon[0]);
  for (const horizonIndex of [0, 1, 2]) {
    assert.ok(impacts.get(0)![horizonIndex] <= impacts.get(7)![horizonIndex] + 1e-12);
    assert.ok(impacts.get(7)![horizonIndex] <= impacts.get(14)![horizonIndex] + 1e-12);
    assert.ok(impacts.get(14)![horizonIndex] <= impacts.get(59)![horizonIndex] + 1e-12);
  }

  const blockedScenario = scenario();
  blockedScenario.interventions = [
    { ...blockedScenario.interventions[0], leadTimeDays: 61 },
  ];
  blockedScenario.constraints.maxLeadTimeDays = 60;
  const blocked = await analyzeInterventions(snapshot, blockedScenario);
  assert.deepEqual(
    blocked.evaluatedBundles.find((item) => item.interventionIds.length === 1)?.reasons,
    ["lead_time_exceeded"],
  );
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

test("reports lead-time, mutual-exclusion, and cost-unit infeasibility explicitly", async () => {
  const constrained = scenario();
  constrained.constraints = {
    budget: 100,
    budgetUnit: "normalized_cost",
    maxInterventions: 3,
    maxLeadTimeDays: 5,
  };
  constrained.interventions[0].mutuallyExclusiveGroup = "route-choice";
  constrained.interventions[1].mutuallyExclusiveGroup = "route-choice";
  constrained.interventions.push({
    ...constrained.interventions[0],
    id: "intervention:incompatible-unit",
    label: "Incompatible cost-unit fixture",
    cost: 1,
    costUnit: "hours",
    leadTimeDays: 1,
    mutuallyExclusiveGroup: undefined,
  });

  const analysis = await analyzeInterventions(await graphSnapshot(), constrained);
  const byIds = (ids: string[]) =>
    analysis.evaluatedBundles.find(
      (item) => item.interventionIds.join("|") === [...ids].sort().join("|"),
    );
  assert.deepEqual(
    byIds(["intervention:diversify-input"])?.reasons,
    ["lead_time_exceeded"],
  );
  assert.deepEqual(
    byIds(["intervention:buffer-medical", "intervention:diversify-input"])?.reasons,
    ["lead_time_exceeded", "mutually_exclusive:route-choice"],
  );
  assert.deepEqual(
    byIds(["intervention:incompatible-unit"])?.reasons,
    ["cost_unit_mismatch:intervention:incompatible-unit"],
  );
});
