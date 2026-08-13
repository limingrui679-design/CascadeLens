import { assertNoErrors } from "./errors";
import { validateScenarioAgainstSnapshot } from "./contracts";
import { includedInBound } from "./evidence";
import { toEpoch } from "./temporal";
import {
  ENGINE_VERSION,
  evidenceGrades,
  type BoundMode,
  type CascadeBounds,
  type CascadeResult,
  type EvidenceGrade,
  type GraphSnapshot,
  type ImpactContribution,
  type ShockDefinition,
  type ShockScenario,
  type WorldNode,
} from "./types";
import {
  edgeWeightForBound,
  auditFlowConservation,
  querySnapshot,
  selectEdges,
  selectNodes,
  verifySnapshot,
} from "./worldgraph";
import { validateScenario } from "./shockscript";

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function combineImpacts(values: number[]): number {
  if (values.length === 0) return 0;
  return clamp01(1 - values.reduce((remaining, value) => remaining * (1 - clamp01(value)), 1));
}

function numericProperty(node: WorldNode, key: string, fallback: number): number {
  const value = node.properties[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function severityForShock(shock: ShockDefinition): number {
  switch (shock.operation) {
    case "multiply_capacity":
      return clamp01(1 - shock.magnitude);
    case "reduce_supply":
    case "policy_restrict":
    case "financial_stress":
      return clamp01(shock.magnitude);
    case "increase_demand":
      return clamp01(1 - 1 / (1 + shock.magnitude));
    case "add_cost":
      return clamp01(shock.magnitude);
    case "disable":
      return 1;
  }
}

function firstShockStart(scenario: ShockScenario): string {
  return [...scenario.shocks]
    .sort((a, b) => toEpoch(a.startsAt) - toEpoch(b.startsAt))[0].startsAt;
}

const millisecondsPerDay = 86_400_000;

interface ActivatedShock {
  activationStep: number;
  deactivationStep?: number;
  id: string;
  matchedNodeIds: string[];
  matchedEdges: GraphSnapshot["edges"];
  severity: number;
}

interface PreparedCascade {
  visible: Pick<GraphSnapshot, "nodes" | "edges">;
  visibleEdgeIds: Set<string>;
  activatedShocks: ActivatedShock[];
  baseWarnings: string[];
}

async function validateCascadeInputs(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
): Promise<void> {
  assertNoErrors("Invalid graph snapshot", await verifySnapshot(snapshot));
  assertNoErrors("Invalid ShockScript", validateScenario(scenario));
  assertNoErrors(
    "Scenario and graph snapshot are incompatible",
    validateScenarioAgainstSnapshot(scenario, snapshot),
  );
  if (scenario.propagation.engine !== "dependency_cascade") {
    throw new RangeError(
      `runCascade only supports dependency_cascade; use an engine registry for ${scenario.propagation.engine}.`,
    );
  }
}

function prepareCascade(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
): PreparedCascade {
  const baseStart = firstShockStart(scenario);
  const baseEpoch = toEpoch(baseStart);
  const visible = querySnapshot(snapshot, firstShockStart(scenario), scenario.decisionCutoff);
  const visibleNodeIds = new Set(visible.nodes.map((node) => node.id));
  const visibleEdgeIds = new Set(visible.edges.map((edge) => edge.id));
  const activatedShocks: ActivatedShock[] = [];
  const baseWarnings: string[] = [];

  for (const shock of scenario.shocks) {
    const hasNodeSelector = Boolean(
      shock.target.ids?.length ||
        shock.target.kind ||
        shock.target.jurisdiction ||
        shock.target.propertyEquals,
    );
    const hasEdgeSelector = Boolean(shock.target.edgeIds?.length || shock.target.relation);
    const matched = hasNodeSelector
      ? selectNodes(snapshot, shock.target).filter((node) => visibleNodeIds.has(node.id))
      : [];
    const matchedEdges = hasEdgeSelector
      ? selectEdges(snapshot, shock.target).filter(
          (edge) => visibleEdgeIds.has(edge.id),
        )
      : [];
    if (matched.length === 0 && matchedEdges.length === 0) {
      baseWarnings.push(`Shock ${shock.id} matched no visible nodes or edges.`);
    }
    activatedShocks.push({
      activationStep: Math.max(
        0,
        Math.ceil((toEpoch(shock.startsAt) - baseEpoch) / millisecondsPerDay),
      ),
      deactivationStep: shock.endsAt
        ? Math.max(
            1,
            Math.ceil((toEpoch(shock.endsAt) - baseEpoch) / millisecondsPerDay),
          )
        : undefined,
      id: shock.id,
      matchedNodeIds: matched.map((node) => node.id),
      matchedEdges,
      severity: severityForShock(shock),
    });
  }
  return { visible, visibleEdgeIds, activatedShocks, baseWarnings };
}

function runPreparedCascade(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bound: BoundMode,
  horizonDays: number,
  prepared: PreparedCascade,
): CascadeResult {
  const { visible, activatedShocks, baseWarnings } = prepared;
  const warnings = [...baseWarnings];
  const impacts = new Map<string, number>();
  const accumulatedImpacts = new Map<string, number>();
  const accumulatedDirectImpacts = new Map<string, number>();
  const peakImpacts = new Map<string, number>();
  const peakDirectImpacts = new Map<string, number>();
  const contributionMap = new Map<string, ImpactContribution[]>();
  for (const node of visible.nodes) {
    impacts.set(node.id, 0);
    accumulatedImpacts.set(node.id, 0);
    accumulatedDirectImpacts.set(node.id, 0);
    peakImpacts.set(node.id, 0);
    peakDirectImpacts.set(node.id, 0);
  }

  const excludedEdgeCounts = Object.fromEntries(
    evidenceGrades.map((grade) => [grade, 0]),
  ) as Record<EvidenceGrade, number>;
  const edges = visible.edges.filter((edge) => {
    const included = includedInBound(edge.evidence.grade, bound);
    if (!included) excludedEdgeCounts[edge.evidence.grade] += 1;
    return included;
  });
  const incomingByNode = new Map<string, GraphSnapshot["edges"]>();
  for (const edge of edges) {
    const incoming = incomingByNode.get(edge.to);
    if (incoming) incoming.push(edge);
    else incomingByNode.set(edge.to, [edge]);
  }

  let converged = false;
  let iterations = 0;
  const finalStep = horizonDays;
  const activatedIds = new Set<string>();
  for (let step = 0; step < finalStep; step += 1) {
    iterations = step + 1;
    const directImpacts = new Map<string, number>();
    for (const shock of activatedShocks) {
      const active =
        shock.activationStep <= step &&
        (shock.deactivationStep === undefined || step < shock.deactivationStep);
      if (!active) continue;
      activatedIds.add(shock.id);
      for (const nodeId of shock.matchedNodeIds) {
        directImpacts.set(
          nodeId,
          combineImpacts([directImpacts.get(nodeId) ?? 0, shock.severity]),
        );
      }
      for (const edge of shock.matchedEdges) {
        if (!includedInBound(edge.evidence.grade, bound)) continue;
        const edgeSeverity = clamp01(
          shock.severity * edgeWeightForBound(edge, bound),
        );
        directImpacts.set(
          edge.to,
          combineImpacts([directImpacts.get(edge.to) ?? 0, edgeSeverity]),
        );
      }
    }

    let maximumChange = 0;
    const next = new Map(impacts);

    for (const node of visible.nodes) {
      const incoming = incomingByNode.get(node.id) ?? [];
      const contributions: ImpactContribution[] = [];
      for (const edge of incoming) {
        const fromImpact = impacts.get(edge.from) ?? 0;
        const weight = edgeWeightForBound(edge, bound);
        const contribution = clamp01(
          fromImpact * weight * scenario.propagation.transmission,
        );
        if (contribution > 0) {
          contributions.push({
            edgeId: edge.id,
            fromNodeId: edge.from,
            contribution,
          });
        }
      }
      const buffer = clamp01(numericProperty(node, "bufferShare", 0));
      const propagated = combineImpacts(contributions.map((item) => item.contribution)) * (1 - buffer);
      const candidate = combineImpacts([directImpacts.get(node.id) ?? 0, propagated]);
      const prior = impacts.get(node.id) ?? 0;
      next.set(node.id, candidate);
      maximumChange = Math.max(maximumChange, Math.abs(candidate - prior));
      accumulatedImpacts.set(
        node.id,
        (accumulatedImpacts.get(node.id) ?? 0) + candidate,
      );
      accumulatedDirectImpacts.set(
        node.id,
        (accumulatedDirectImpacts.get(node.id) ?? 0) +
          (directImpacts.get(node.id) ?? 0),
      );
      const sortedContributions = contributions
        .sort((a, b) => b.contribution - a.contribution)
        .slice(0, 8);
      if (candidate > (peakImpacts.get(node.id) ?? 0) + 1e-15) {
        peakImpacts.set(node.id, candidate);
        peakDirectImpacts.set(node.id, directImpacts.get(node.id) ?? 0);
        contributionMap.set(node.id, sortedContributions);
      }
    }

    for (const [nodeId, value] of next) impacts.set(nodeId, value);
    converged = maximumChange < scenario.propagation.tolerance;
  }

  if (!converged) {
    warnings.push("Cascade had not settled by the requested horizon.");
  }
  for (const shock of activatedShocks) {
    if (!activatedIds.has(shock.id)) {
      warnings.push(`Shock ${shock.id} begins after the ${horizonDays}-day horizon.`);
    }
  }
  if (edges.length === 0) {
    warnings.push("No eligible dependency edges were visible for this bound.");
  }
  for (const conservationIssue of auditFlowConservation(snapshot, bound)) {
    warnings.push(
      `Incoming ${conservationIssue.relation} shares for ${conservationIssue.nodeId} exceed one by ${conservationIssue.excess.toFixed(6)}.`,
    );
  }

  const nodeImpacts = visible.nodes
    .map((node) => ({
      nodeId: node.id,
      impact: (accumulatedImpacts.get(node.id) ?? 0) / horizonDays,
      peakImpact: peakImpacts.get(node.id) ?? 0,
      endImpact: impacts.get(node.id) ?? 0,
      directImpact: (accumulatedDirectImpacts.get(node.id) ?? 0) / horizonDays,
      peakDirectImpact: peakDirectImpacts.get(node.id) ?? 0,
      contributions: contributionMap.get(node.id) ?? [],
    }))
    .sort((a, b) => b.impact - a.impact || a.nodeId.localeCompare(b.nodeId));
  const totalCriticality = visible.nodes.reduce(
    (sum, node) => sum + Math.max(0, numericProperty(node, "criticality", 1)),
    0,
  );
  const totalWeightedImpact =
    totalCriticality === 0
      ? 0
      : visible.nodes.reduce(
          (sum, node) =>
            sum +
            ((accumulatedImpacts.get(node.id) ?? 0) / horizonDays) *
              Math.max(0, numericProperty(node, "criticality", 1)),
          0,
        ) / totalCriticality;
  const totalWeightedPeakEnvelope =
    totalCriticality === 0
      ? 0
      : visible.nodes.reduce(
          (sum, node) =>
            sum +
            (peakImpacts.get(node.id) ?? 0) *
              Math.max(0, numericProperty(node, "criticality", 1)),
          0,
        ) / totalCriticality;
  const endWeightedImpact =
    totalCriticality === 0
      ? 0
      : visible.nodes.reduce(
          (sum, node) =>
            sum +
            (impacts.get(node.id) ?? 0) *
              Math.max(0, numericProperty(node, "criticality", 1)),
          0,
        ) / totalCriticality;

  return {
    engineVersion: ENGINE_VERSION,
    scenarioId: scenario.scenarioId,
    snapshotDigest: snapshot.contentDigest,
    bound,
    metric: "time_weighted_mean_node_impact",
    horizonDays,
    converged,
    iterations,
    totalWeightedImpact,
    totalWeightedPeakEnvelope,
    endWeightedImpact,
    impacts: nodeImpacts,
    excludedEdgeCounts,
    warnings,
  };
}

export async function runCascadeAtHorizon(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bound: BoundMode,
  horizonDays: number,
): Promise<CascadeResult> {
  if (!Number.isInteger(horizonDays) || horizonDays <= 0) {
    throw new RangeError("Cascade horizon must be a positive integer number of days.");
  }
  await validateCascadeInputs(snapshot, scenario);
  return runPreparedCascade(
    snapshot,
    scenario,
    bound,
    horizonDays,
    prepareCascade(snapshot, scenario),
  );
}

export async function runCascade(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bound: BoundMode,
): Promise<CascadeResult> {
  return runCascadeAtHorizon(
    snapshot,
    scenario,
    bound,
    Math.max(...scenario.propagation.horizonsDays),
  );
}

export async function runCascadeBounds(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
): Promise<CascadeBounds> {
  await validateCascadeInputs(snapshot, scenario);
  const prepared = prepareCascade(snapshot, scenario);
  const horizonDays = [...scenario.propagation.horizonsDays].sort(
    (left, right) => left - right,
  );
  const horizons = horizonDays.map((days) => ({
    horizonDays: days,
    lower: runPreparedCascade(snapshot, scenario, "lower", days, prepared),
    central: runPreparedCascade(snapshot, scenario, "central", days, prepared),
    upper: runPreparedCascade(snapshot, scenario, "upper", days, prepared),
  }));
  const { lower, central, upper } = horizons[horizons.length - 1];
  const lowerByNode = new Map(lower.impacts.map((item) => [item.nodeId, item.impact]));
  const centralByNode = new Map(central.impacts.map((item) => [item.nodeId, item.impact]));
  for (const upperImpact of upper.impacts) {
    const lowerImpact = lowerByNode.get(upperImpact.nodeId) ?? 0;
    const centralImpact = centralByNode.get(upperImpact.nodeId) ?? 0;
    if (lowerImpact > centralImpact + 1e-12 || centralImpact > upperImpact.impact + 1e-12) {
      throw new Error(`Non-monotone impact bounds for node ${upperImpact.nodeId}.`);
    }
  }
  return { lower, central, upper, horizons };
}
