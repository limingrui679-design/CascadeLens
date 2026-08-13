import { canUseEvidence } from "./evidence";
import {
  type GraphSnapshot,
  type InterventionAnalysis,
  type InterventionBundleResult,
  type InterventionDefinition,
  type ShockScenario,
  type WorldEdge,
  type WorldNode,
} from "./types";
import { runCascadeBounds } from "./cascade";
import { sealSnapshot, toSnapshotDraft } from "./worldgraph";

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

function combineReduction(existing: number, added: number): number {
  return 1 - (1 - existing) * (1 - added);
}

async function applyInterventions(
  snapshot: GraphSnapshot,
  selected: InterventionDefinition[],
): Promise<GraphSnapshot> {
  const nodeEffects = new Map<string, number>();
  const edgeEffects = new Map<string, number>();
  for (const intervention of selected) {
    if (intervention.type === "evidence_acquisition") continue;
    for (const nodeId of intervention.targetNodeIds) {
      nodeEffects.set(
        nodeId,
        combineReduction(nodeEffects.get(nodeId) ?? 0, intervention.effect),
      );
    }
    for (const edgeId of intervention.targetEdgeIds) {
      edgeEffects.set(
        edgeId,
        combineReduction(edgeEffects.get(edgeId) ?? 0, intervention.effect),
      );
    }
  }

  const nodes: WorldNode[] = snapshot.nodes.map((node) => {
    const effect = nodeEffects.get(node.id);
    if (effect === undefined) return node;
    const existing =
      typeof node.properties.bufferShare === "number"
        ? node.properties.bufferShare
        : 0;
    return {
      ...node,
      properties: {
        ...node.properties,
        bufferShare: combineReduction(existing, effect),
      },
    };
  });
  const edges: WorldEdge[] = snapshot.edges.map((edge) => {
    const effect = edgeEffects.get(edge.id);
    if (effect === undefined) return edge;
    return {
      ...edge,
      weight: {
        ...edge.weight,
        value: edge.weight.value * (1 - effect),
        lower: (edge.weight.lower ?? edge.weight.value) * (1 - effect),
        upper: (edge.weight.upper ?? edge.weight.value) * (1 - effect),
      },
    };
  });
  const draft = toSnapshotDraft(snapshot);
  return sealSnapshot({
    ...draft,
    nodes,
    edges,
  });
}

function feasibility(
  scenario: ShockScenario,
  selected: InterventionDefinition[],
): string[] {
  const reasons: string[] = [];
  const cost = selected.reduce((sum, item) => sum + item.cost, 0);
  if (scenario.constraints.budget !== undefined && cost > scenario.constraints.budget + 1e-12) {
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
    selected.some((item) => item.leadTimeDays > scenario.constraints.maxLeadTimeDays!)
  ) {
    reasons.push("lead_time_exceeded");
  }
  const groups = new Map<string, number>();
  for (const item of selected) {
    if (item.mutuallyExclusiveGroup) {
      groups.set(item.mutuallyExclusiveGroup, (groups.get(item.mutuallyExclusiveGroup) ?? 0) + 1);
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
  return [...new Set(reasons)].sort();
}

function pareto(results: InterventionBundleResult[]): InterventionBundleResult[] {
  const feasible = results.filter(
    (result): result is InterventionBundleResult & { worstCaseImpact: number } =>
      result.feasible && result.worstCaseImpact !== null,
  );
  return feasible
    .filter(
      (candidate) =>
        !feasible.some(
          (other) =>
            other !== candidate &&
            other.cost <= candidate.cost &&
            other.worstCaseImpact <= candidate.worstCaseImpact &&
            (other.cost < candidate.cost ||
              other.worstCaseImpact < candidate.worstCaseImpact),
        ),
    )
    .sort((a, b) => a.cost - b.cost || a.worstCaseImpact - b.worstCaseImpact);
}

export async function analyzeInterventions(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
): Promise<InterventionAnalysis> {
  const evaluated: InterventionBundleResult[] = [];
  for (const selected of combinations(scenario.interventions)) {
    const reasons = feasibility(scenario, selected);
    const cost = selected.reduce((sum, item) => sum + item.cost, 0);
    if (reasons.length > 0) {
      evaluated.push({
        interventionIds: selected.map((item) => item.id).sort(),
        strategy: selected.length === 0 ? "do_not_act" : "intervene",
        cost,
        feasible: false,
        lowerImpact: null,
        centralImpact: null,
        upperImpact: null,
        worstCaseImpact: null,
        reasons,
      });
      continue;
    }
    const modified = await applyInterventions(snapshot, selected);
    const bounds = await runCascadeBounds(modified, scenario);
    evaluated.push({
      interventionIds: selected.map((item) => item.id).sort(),
      strategy: selected.length === 0 ? "do_not_act" : "intervene",
      cost,
      feasible: true,
      lowerImpact: bounds.lower.totalWeightedImpact,
      centralImpact: bounds.central.totalWeightedImpact,
      upperImpact: bounds.upper.totalWeightedImpact,
      worstCaseImpact: bounds.upper.totalWeightedImpact,
      reasons: [],
    });
  }

  const frontier = pareto(evaluated);
  const baselineBundle = evaluated.find(
    (item) => item.interventionIds.length === 0,
  );
  if (!baselineBundle) {
    throw new Error("Intervention analysis did not produce a do_not_act baseline.");
  }
  const best = [...evaluated]
    .filter(
      (item): item is InterventionBundleResult & { worstCaseImpact: number } =>
        item.feasible && item.worstCaseImpact !== null,
    )
    .sort(
      (a, b) =>
        a.worstCaseImpact - b.worstCaseImpact ||
        a.cost - b.cost ||
        a.interventionIds.join(",").localeCompare(b.interventionIds.join(",")),
    )[0];
  let recommendationStatus: InterventionAnalysis["recommendationStatus"] = "blocked";
  if (best) {
    const selected = scenario.interventions.filter((item) =>
      best.interventionIds.includes(item.id),
    );
    recommendationStatus =
      scenario.constraints.budget === undefined ||
      selected.some((item) => !canUseEvidence(item.evidenceGrade, "primary"))
        ? "evidence_required"
        : "eligible";
  }

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
    evaluatedBundles: evaluated.sort(
      (a, b) =>
        Number(b.feasible) - Number(a.feasible) ||
        a.cost - b.cost ||
        a.interventionIds.join(",").localeCompare(b.interventionIds.join(",")),
    ),
    paretoFrontier: frontier,
    baselineBundle,
    recommendedBundleIds: best?.interventionIds ?? [],
    recommendationStatus,
    reversalThresholds,
  };
}
