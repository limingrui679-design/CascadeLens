import { compareCanonicalStrings } from "./canonical";
import {
  firstShockStart,
  interventionActivationAt,
  runCascadeBounds,
} from "./cascade";
import { canUseEvidence } from "./evidence";
import { toEpoch } from "./temporal";
import type {
  GraphSnapshot,
  InterventionAnalysis,
  InterventionBundleResult,
  InterventionDefinition,
  ShockScenario,
} from "./types";

const millisecondsPerDay = 86_400_000;

function combinations<T>(items: T[]): T[][] {
  if (items.length > 16) {
    throw new RangeError("At most 16 interventions may be enumerated in the local engine.");
  }
  const output: T[][] = [];
  const count = 2 ** items.length;
  for (let mask = 0; mask < count; mask += 1) {
    const selected: T[] = [];
    for (let index = 0; index < items.length; index += 1) {
      if ((mask & (1 << index)) !== 0) selected.push(items[index]);
    }
    output.push(selected);
  }
  return output;
}

function feasibility(
  scenario: ShockScenario,
  selected: InterventionDefinition[],
): string[] {
  const reasons: string[] = [];
  const cost = selected.reduce((sum, item) => sum + item.cost, 0);
  if (
    scenario.constraints.budget !== undefined &&
    cost > scenario.constraints.budget + 1e-12
  ) {
    reasons.push("budget_exceeded");
  }
  if (
    scenario.constraints.maxInterventions !== undefined &&
    selected.length > scenario.constraints.maxInterventions
  ) {
    reasons.push("intervention_limit_exceeded");
  }
  if (
    scenario.constraints.maxLeadTimeDays !== undefined &&
    selected.some(
      (item) => item.leadTimeDays > scenario.constraints.maxLeadTimeDays!,
    )
  ) {
    reasons.push("lead_time_exceeded");
  }
  const groups = new Map<string, number>();
  for (const item of selected) {
    if (item.mutuallyExclusiveGroup) {
      groups.set(
        item.mutuallyExclusiveGroup,
        (groups.get(item.mutuallyExclusiveGroup) ?? 0) + 1,
      );
    }
    if (
      scenario.constraints.budgetUnit &&
      item.costUnit !== scenario.constraints.budgetUnit
    ) {
      reasons.push(`cost_unit_mismatch:${item.id}`);
    }
  }
  for (const [group, count] of groups) {
    if (count > 1) reasons.push(`mutually_exclusive:${group}`);
  }
  return [...new Set(reasons)].sort(compareCanonicalStrings);
}

function horizonImpact(
  result: InterventionBundleResult,
  horizonDays?: number,
): number | null {
  if (horizonDays === undefined) return result.worstCaseImpact;
  return (
    result.horizonResults.find((item) => item.horizonDays === horizonDays)
      ?.worstCaseImpact ?? null
  );
}

function pareto(
  results: InterventionBundleResult[],
  horizonDays?: number,
): InterventionBundleResult[] {
  const feasible = results.filter(
    (result) => result.feasible && horizonImpact(result, horizonDays) !== null,
  );
  return feasible
    .filter((candidate) => {
      const candidateImpact = horizonImpact(candidate, horizonDays)!;
      return !feasible.some((other) => {
        if (other === candidate) return false;
        const otherImpact = horizonImpact(other, horizonDays)!;
        return (
          other.cost <= candidate.cost &&
          otherImpact <= candidateImpact &&
          (other.cost < candidate.cost || otherImpact < candidateImpact)
        );
      });
    })
    .sort((left, right) => {
      const impactDifference =
        horizonImpact(left, horizonDays)! - horizonImpact(right, horizonDays)!;
      return left.cost - right.cost || impactDifference;
    });
}

function bestBundle(
  results: InterventionBundleResult[],
  horizonDays?: number,
): InterventionBundleResult | undefined {
  return [...results]
    .filter((item) => item.feasible && horizonImpact(item, horizonDays) !== null)
    .sort((left, right) => {
      const leftImpact = horizonImpact(left, horizonDays)!;
      const rightImpact = horizonImpact(right, horizonDays)!;
      return (
        leftImpact - rightImpact ||
        left.cost - right.cost ||
        compareCanonicalStrings(
          left.interventionIds.join(","),
          right.interventionIds.join(","),
        )
      );
    })[0];
}

function recommendationStatus(
  scenario: ShockScenario,
  bundle: InterventionBundleResult | undefined,
): InterventionAnalysis["recommendationStatus"] {
  if (!bundle) return "blocked";
  const selected = scenario.interventions.filter((item) =>
    bundle.interventionIds.includes(item.id),
  );
  return scenario.constraints.budget === undefined ||
    selected.some((item) => !canUseEvidence(item.evidenceGrade, "primary"))
    ? "evidence_required"
    : "eligible";
}

export async function analyzeInterventions(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
): Promise<InterventionAnalysis> {
  const evaluated: InterventionBundleResult[] = [];
  const horizonDays = [...scenario.propagation.horizonsDays].sort(
    (left, right) => left - right,
  );
  const horizonEnd = (days: number) =>
    toEpoch(firstShockStart(scenario)) + days * millisecondsPerDay;

  for (const selected of combinations(scenario.interventions)) {
    const reasons = feasibility(scenario, selected);
    const interventionIds = selected
      .map((item) => item.id)
      .sort(compareCanonicalStrings);
    const cost = selected.reduce((sum, item) => sum + item.cost, 0);
    const activationSchedule = selected
      .map((item) => ({
        interventionId: item.id,
        activationAt: interventionActivationAt(scenario, item),
        leadTimeDays: item.leadTimeDays,
      }))
      .sort((left, right) =>
        compareCanonicalStrings(left.interventionId, right.interventionId),
      );
    if (reasons.length > 0) {
      evaluated.push({
        interventionIds,
        strategy: selected.length === 0 ? "do_not_act" : "intervene",
        cost,
        feasible: false,
        lowerImpact: null,
        centralImpact: null,
        upperImpact: null,
        worstCaseImpact: null,
        activationSchedule,
        horizonResults: horizonDays.map((days) => ({
          horizonDays: days,
          lowerImpact: null,
          centralImpact: null,
          upperImpact: null,
          worstCaseImpact: null,
          activeInterventionIds: [],
          pendingInterventionIds: interventionIds,
        })),
        reasons,
      });
      continue;
    }

    const bounds = await runCascadeBounds(snapshot, scenario, {
      interventions: selected,
    });
    const horizonResults = bounds.horizons.map((item) => {
      const activeInterventionIds = activationSchedule
        .filter((activation) => toEpoch(activation.activationAt) < horizonEnd(item.horizonDays))
        .map((activation) => activation.interventionId);
      return {
        horizonDays: item.horizonDays,
        lowerImpact: item.lower.totalWeightedImpact,
        centralImpact: item.central.totalWeightedImpact,
        upperImpact: item.upper.totalWeightedImpact,
        worstCaseImpact: item.upper.totalWeightedImpact,
        activeInterventionIds,
        pendingInterventionIds: interventionIds.filter(
          (id) => !activeInterventionIds.includes(id),
        ),
      };
    });
    evaluated.push({
      interventionIds,
      strategy: selected.length === 0 ? "do_not_act" : "intervene",
      cost,
      feasible: true,
      lowerImpact: bounds.lower.totalWeightedImpact,
      centralImpact: bounds.central.totalWeightedImpact,
      upperImpact: bounds.upper.totalWeightedImpact,
      worstCaseImpact: bounds.upper.totalWeightedImpact,
      activationSchedule,
      horizonResults,
      reasons: [],
    });
  }

  const sortedEvaluated = evaluated.sort(
    (left, right) =>
      Number(right.feasible) - Number(left.feasible) ||
      left.cost - right.cost ||
      compareCanonicalStrings(
        left.interventionIds.join(","),
        right.interventionIds.join(","),
      ),
  );
  const frontier = pareto(sortedEvaluated);
  const baselineBundle = sortedEvaluated.find(
    (item) => item.interventionIds.length === 0,
  );
  if (!baselineBundle) {
    throw new Error("Intervention analysis did not produce a do_not_act baseline.");
  }
  const best = bestBundle(sortedEvaluated);

  const reversalThresholds: InterventionAnalysis["reversalThresholds"] = [];
  for (let index = 1; index < frontier.length; index += 1) {
    const left = frontier[index - 1];
    const right = frontier[index];
    const impactGain = left.worstCaseImpact! - right.worstCaseImpact!;
    const addedCost = right.cost - left.cost;
    if (impactGain > 0 && addedCost >= 0) {
      reversalThresholds.push({
        parameter: "risk_value_per_unit",
        threshold: addedCost / impactGain,
        fromBundleIds: left.interventionIds,
        toBundleIds: right.interventionIds,
      });
    }
  }

  return {
    scenarioId: scenario.scenarioId,
    evaluatedBundles: sortedEvaluated,
    paretoFrontier: frontier,
    baselineBundle,
    recommendedBundleIds: best?.interventionIds ?? [],
    recommendationStatus: recommendationStatus(scenario, best),
    horizonAnalyses: horizonDays.map((days) => {
      const horizonBest = bestBundle(sortedEvaluated, days);
      return {
        horizonDays: days,
        paretoFrontier: pareto(sortedEvaluated, days),
        recommendedBundleIds: horizonBest?.interventionIds ?? [],
        recommendationStatus: recommendationStatus(scenario, horizonBest),
      };
    }),
    reversalThresholds,
  };
}
