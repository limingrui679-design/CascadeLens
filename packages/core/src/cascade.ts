import { compareCanonicalStrings } from "./canonical";
import { validateScenarioAgainstSnapshot } from "./contracts";
import { includedInBound } from "./evidence";
import { assertNoErrors } from "./errors";
import { validateScenario } from "./shockscript";
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
  type InterventionDefinition,
  type ShockDefinition,
  type ShockScenario,
  type WorldEdge,
  type WorldNode,
} from "./types";
import {
  auditFlowConservation,
  edgeWeightForBound,
  selectEdges,
  selectNodes,
  verifySnapshot,
} from "./worldgraph";

const millisecondsPerDay = 86_400_000;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function combineImpacts(values: number[]): number {
  if (values.length === 0) return 0;
  return clamp01(
    1 - values.reduce((remaining, value) => remaining * (1 - clamp01(value)), 1),
  );
}

function combineReduction(existing: number, added: number): number {
  return 1 - (1 - clamp01(existing)) * (1 - clamp01(added));
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

export function firstShockStart(scenario: ShockScenario): string {
  return [...scenario.shocks]
    .sort((left, right) => toEpoch(left.startsAt) - toEpoch(right.startsAt))[0]
    .startsAt;
}

export function interventionActivationAt(
  scenario: ShockScenario,
  intervention: InterventionDefinition,
): string {
  return new Date(
    toEpoch(scenario.decisionCutoff) + intervention.leadTimeDays * millisecondsPerDay,
  ).toISOString();
}

interface ActivatedShock {
  activationStep: number;
  deactivationStep?: number;
  id: string;
  matchedNodeIds: string[];
  matchedEdges: GraphSnapshot["edges"];
  severity: number;
}

interface PreparedCascade {
  baseEpoch: number;
  activatedShocks: ActivatedShock[];
  baseWarnings: string[];
  nodeVisibility: Array<PreparedTemporalRecord<WorldNode>>;
  edgeVisibility: Array<PreparedTemporalRecord<WorldEdge>>;
  visibilityChangeSteps: Set<number>;
  visibleByStep: Map<number, VisibleGraph>;
  topologyByVisible: WeakMap<VisibleGraph, Map<BoundMode, BoundTopology>>;
}

interface PreparedTemporalRecord<T extends WorldNode | WorldEdge> {
  record: T;
  known: boolean;
  validFrom: number;
  validTo: number;
}

interface VisibleGraph {
  nodes: WorldNode[];
  edges: WorldEdge[];
  nodeIds: Set<string>;
  edgeIds: Set<string>;
}

interface BoundTopology {
  edges: WorldEdge[];
  incomingByNode: Map<string, WorldEdge[]>;
  acyclicOrder: WorldNode[] | null;
  excludedEdgeIds: Record<EvidenceGrade, string[]>;
}

interface AcyclicDaySolution {
  impacts: Map<string, number>;
  contributions: Map<string, ImpactContribution[]>;
}

export interface CascadeRunOptions {
  interventions?: InterventionDefinition[];
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
  const baseEpoch = toEpoch(firstShockStart(scenario));
  const knownAtEpoch = toEpoch(scenario.decisionCutoff);
  const activatedShocks: ActivatedShock[] = [];
  const baseWarnings: string[] = [];

  for (const shock of scenario.shocks) {
    const hasNodeSelector = Boolean(
      shock.target.ids?.length ||
        shock.target.kind ||
        shock.target.jurisdiction ||
        shock.target.propertyEquals,
    );
    const hasEdgeSelector = Boolean(
      shock.target.edgeIds?.length || shock.target.relation,
    );
    const matchedNodes = hasNodeSelector
      ? selectNodes(snapshot, shock.target)
      : [];
    const matchedEdges = hasEdgeSelector
      ? selectEdges(snapshot, shock.target)
      : [];
    if (matchedNodes.length === 0 && matchedEdges.length === 0) {
      baseWarnings.push(`Shock ${shock.id} matched no graph nodes or edges.`);
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
      matchedNodeIds: matchedNodes.map((node) => node.id),
      matchedEdges,
      severity: severityForShock(shock),
    });
  }
  const prepareTemporal = <T extends WorldNode | WorldEdge>(record: T) => ({
    record,
    known:
      toEpoch(record.observedAt) <= knownAtEpoch &&
      (record.supersededAt === undefined || toEpoch(record.supersededAt) > knownAtEpoch),
    validFrom: toEpoch(record.validFrom),
    validTo: record.validTo === undefined ? Number.POSITIVE_INFINITY : toEpoch(record.validTo),
  });
  const nodeVisibility = snapshot.nodes.map(prepareTemporal);
  const edgeVisibility = snapshot.edges.map(prepareTemporal);
  const visibilityChangeSteps = new Set<number>();
  for (const item of [...nodeVisibility, ...edgeVisibility]) {
    if (!item.known) continue;
    for (const epoch of [item.validFrom, item.validTo]) {
      if (!Number.isFinite(epoch)) continue;
      visibilityChangeSteps.add(
        Math.max(0, Math.ceil((epoch - baseEpoch) / millisecondsPerDay)),
      );
    }
  }
  return {
    baseEpoch,
    activatedShocks,
    baseWarnings,
    nodeVisibility,
    edgeVisibility,
    visibilityChangeSteps,
    visibleByStep: new Map(),
    topologyByVisible: new WeakMap(),
  };
}

function visibleGraphAtStep(prepared: PreparedCascade, step: number): VisibleGraph {
  const cached = prepared.visibleByStep.get(step);
  if (cached) return cached;
  if (step > 0 && !prepared.visibilityChangeSteps.has(step)) {
    const previous = prepared.visibleByStep.get(step - 1);
    if (previous) {
      prepared.visibleByStep.set(step, previous);
      return previous;
    }
  }
  const currentEpoch = prepared.baseEpoch + step * millisecondsPerDay;
  const nodes = prepared.nodeVisibility
    .filter((item) => item.known && item.validFrom <= currentEpoch && item.validTo > currentEpoch)
    .map((item) => item.record);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = prepared.edgeVisibility
    .filter(
      (item) =>
        item.known &&
        item.validFrom <= currentEpoch &&
        item.validTo > currentEpoch &&
        nodeIds.has(item.record.from) &&
        nodeIds.has(item.record.to),
    )
    .map((item) => item.record);
  const visible = {
    nodes,
    edges,
    nodeIds,
    edgeIds: new Set(edges.map((edge) => edge.id)),
  };
  prepared.visibleByStep.set(step, visible);
  return visible;
}

function topologyForBound(
  prepared: PreparedCascade,
  visible: VisibleGraph,
  bound: BoundMode,
): BoundTopology {
  let byBound = prepared.topologyByVisible.get(visible);
  if (!byBound) {
    byBound = new Map();
    prepared.topologyByVisible.set(visible, byBound);
  }
  const cached = byBound.get(bound);
  if (cached) return cached;
  const edges: WorldEdge[] = [];
  const excludedEdgeIds = Object.fromEntries(
    evidenceGrades.map((grade) => [grade, [] as string[]]),
  ) as Record<EvidenceGrade, string[]>;
  for (const edge of visible.edges) {
    if (includedInBound(edge.evidence.grade, bound)) edges.push(edge);
    else excludedEdgeIds[edge.evidence.grade].push(edge.id);
  }
  const incomingByNode = new Map<string, WorldEdge[]>();
  for (const edge of edges) {
    const incoming = incomingByNode.get(edge.to);
    if (incoming) incoming.push(edge);
    else incomingByNode.set(edge.to, [edge]);
  }
  const topology = {
    edges,
    incomingByNode,
    acyclicOrder: topologicalOrder(visible.nodes, edges),
    excludedEdgeIds,
  };
  byBound.set(bound, topology);
  return topology;
}

function interventionEffects(
  scenario: ShockScenario,
  interventions: InterventionDefinition[],
  currentEpoch: number,
): {
  nodeEffects: Map<string, number>;
  edgeEffects: Map<string, number>;
  activationKey: string;
} {
  const nodeEffects = new Map<string, number>();
  const edgeEffects = new Map<string, number>();
  const activeIds: string[] = [];
  for (const intervention of interventions) {
    if (
      intervention.type === "evidence_acquisition" ||
      currentEpoch < toEpoch(interventionActivationAt(scenario, intervention))
    ) {
      continue;
    }
    activeIds.push(intervention.id);
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
  return {
    nodeEffects,
    edgeEffects,
    activationKey: activeIds.sort(compareCanonicalStrings).join("\u0000"),
  };
}

function adjustedEdgeWeight(
  edge: WorldEdge,
  bound: BoundMode,
  edgeEffects: Map<string, number>,
): number {
  return edgeWeightForBound(edge, bound) * (1 - (edgeEffects.get(edge.id) ?? 0));
}

function topologicalOrder(
  nodes: WorldNode[],
  edges: WorldEdge[],
): WorldNode[] | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const inDegree = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    const targets = outgoing.get(edge.from);
    if (targets) targets.push(edge.to);
    else outgoing.set(edge.from, [edge.to]);
  }
  const queue = nodes
    .filter((node) => inDegree.get(node.id) === 0)
    .map((node) => node.id);
  const ordered: WorldNode[] = [];
  for (let index = 0; index < queue.length; index += 1) {
    const nodeId = queue[index];
    const node = byId.get(nodeId);
    if (node) ordered.push(node);
    for (const target of outgoing.get(nodeId) ?? []) {
      const remaining = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, remaining);
      if (remaining === 0) queue.push(target);
    }
  }
  return ordered.length === nodes.length ? ordered : null;
}

function runPreparedCascadeSeries(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bound: BoundMode,
  requestedHorizons: number[],
  prepared: PreparedCascade,
  options: CascadeRunOptions,
): Map<number, CascadeResult> {
  const horizons = [...new Set(requestedHorizons)].sort((left, right) => left - right);
  const maximumHorizon = horizons.at(-1);
  if (!maximumHorizon || horizons.some((days) => !Number.isInteger(days) || days <= 0)) {
    throw new RangeError("Cascade horizons must be positive integer numbers of days.");
  }
  const horizonSet = new Set(horizons);
  const results = new Map<number, CascadeResult>();
  const { baseEpoch, activatedShocks, baseWarnings } = prepared;
  const impacts = new Map(snapshot.nodes.map((node) => [node.id, 0]));
  const accumulatedImpacts = new Map(snapshot.nodes.map((node) => [node.id, 0]));
  const accumulatedDirectImpacts = new Map(snapshot.nodes.map((node) => [node.id, 0]));
  const peakImpacts = new Map(snapshot.nodes.map((node) => [node.id, 0]));
  const peakDirectImpacts = new Map(snapshot.nodes.map((node) => [node.id, 0]));
  const contributionMap = new Map<string, ImpactContribution[]>();
  const everVisibleNodeIds = new Set<string>();
  const excludedEdgeIds = Object.fromEntries(
    evidenceGrades.map((grade) => [grade, new Set<string>()]),
  ) as Record<EvidenceGrade, Set<string>>;
  const activatedIds = new Set<string>();
  let allDailySolvesConverged = true;
  let solverIterations = 0;
  let maxSolverIterationsUsed = 0;
  let eligibleEdgeWasVisible = false;
  const seenTopologies = new Set<BoundTopology>();
  const acyclicDailyCache = new WeakMap<
    VisibleGraph,
    Map<string, AcyclicDaySolution>
  >();

  const buildResult = (horizonDays: number): CascadeResult => {
    const warnings = [...baseWarnings];
    if (!allDailySolvesConverged) {
      warnings.push(
        "At least one daily fixed-point solve reached maxIterations before meeting tolerance.",
      );
    }
    for (const shock of activatedShocks) {
      if (!activatedIds.has(shock.id)) {
        warnings.push(`Shock ${shock.id} begins after the ${horizonDays}-day horizon.`);
      }
    }
    if (!eligibleEdgeWasVisible) {
      warnings.push("No eligible dependency edges were visible for this bound.");
    }
    for (const conservationIssue of auditFlowConservation(snapshot, bound)) {
      warnings.push(
        `Incoming ${conservationIssue.relation} shares for ${conservationIssue.nodeId} exceed one by ${conservationIssue.excess.toFixed(6)}.`,
      );
    }

    const outputNodes = snapshot.nodes.filter((node) => everVisibleNodeIds.has(node.id));
    const nodeImpacts = outputNodes
      .map((node) => ({
        nodeId: node.id,
        impact: (accumulatedImpacts.get(node.id) ?? 0) / horizonDays,
        peakImpact: peakImpacts.get(node.id) ?? 0,
        endImpact: impacts.get(node.id) ?? 0,
        directImpact: (accumulatedDirectImpacts.get(node.id) ?? 0) / horizonDays,
        peakDirectImpact: peakDirectImpacts.get(node.id) ?? 0,
        contributions: contributionMap.get(node.id) ?? [],
      }))
      .sort(
        (left, right) =>
          right.impact - left.impact ||
          compareCanonicalStrings(left.nodeId, right.nodeId),
      );
    const totalCriticality = outputNodes.reduce(
      (sum, node) => sum + Math.max(0, numericProperty(node, "criticality", 1)),
      0,
    );
    const totalWeightedImpact =
      totalCriticality === 0
        ? 0
        : outputNodes.reduce(
            (sum, node) =>
              sum +
              ((accumulatedImpacts.get(node.id) ?? 0) / horizonDays) *
                Math.max(0, numericProperty(node, "criticality", 1)),
            0,
          ) / totalCriticality;
    const totalWeightedPeakEnvelope =
      totalCriticality === 0
        ? 0
        : outputNodes.reduce(
            (sum, node) =>
              sum +
              (peakImpacts.get(node.id) ?? 0) *
                Math.max(0, numericProperty(node, "criticality", 1)),
            0,
          ) / totalCriticality;
    const endWeightedImpact =
      totalCriticality === 0
        ? 0
        : outputNodes.reduce(
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
      converged: allDailySolvesConverged,
      iterations: solverIterations,
      simulatedDays: horizonDays,
      maxSolverIterationsUsed,
      totalWeightedImpact,
      totalWeightedPeakEnvelope,
      endWeightedImpact,
      impacts: nodeImpacts,
      excludedEdgeCounts: Object.fromEntries(
        evidenceGrades.map((grade) => [grade, excludedEdgeIds[grade].size]),
      ) as Record<EvidenceGrade, number>,
      warnings,
    };
  };

  for (let step = 0; step < maximumHorizon; step += 1) {
    const currentEpoch = baseEpoch + step * millisecondsPerDay;
    const visible = visibleGraphAtStep(prepared, step);
    const visibleNodeIds = visible.nodeIds;
    const visibleEdgeIds = visible.edgeIds;
    for (const node of visible.nodes) everVisibleNodeIds.add(node.id);
    for (const node of snapshot.nodes) {
      if (!visibleNodeIds.has(node.id)) impacts.set(node.id, 0);
    }

    const { nodeEffects, edgeEffects, activationKey } = interventionEffects(
      scenario,
      options.interventions ?? [],
      currentEpoch,
    );
    const topology = topologyForBound(prepared, visible, bound);
    const { edges, incomingByNode, acyclicOrder } = topology;
    if (!seenTopologies.has(topology)) {
      seenTopologies.add(topology);
      if (edges.length > 0) eligibleEdgeWasVisible = true;
      for (const grade of evidenceGrades) {
        for (const edgeId of topology.excludedEdgeIds[grade]) {
          excludedEdgeIds[grade].add(edgeId);
        }
      }
    }

    const directImpacts = new Map<string, number>();
    const activeShockIds: string[] = [];
    for (const shock of activatedShocks) {
      const active =
        shock.activationStep <= step &&
        (shock.deactivationStep === undefined || step < shock.deactivationStep);
      if (!active) continue;
      activatedIds.add(shock.id);
      activeShockIds.push(shock.id);
      for (const nodeId of shock.matchedNodeIds) {
        if (!visibleNodeIds.has(nodeId)) continue;
        directImpacts.set(
          nodeId,
          combineImpacts([directImpacts.get(nodeId) ?? 0, shock.severity]),
        );
      }
      for (const edge of shock.matchedEdges) {
        if (
          !visibleEdgeIds.has(edge.id) ||
          !includedInBound(edge.evidence.grade, bound)
        ) {
          continue;
        }
        const edgeSeverity = clamp01(
          shock.severity * adjustedEdgeWeight(edge, bound, edgeEffects),
        );
        directImpacts.set(
          edge.to,
          combineImpacts([directImpacts.get(edge.to) ?? 0, edgeSeverity]),
        );
      }
    }

    let dailyConverged = false;
    let dailyIterations = 0;
    let finalContributions = new Map<string, ImpactContribution[]>();
    if (acyclicOrder) {
      let byActivation = acyclicDailyCache.get(visible);
      if (!byActivation) {
        byActivation = new Map();
        acyclicDailyCache.set(visible, byActivation);
      }
      const dayKey = `${activeShockIds.join("\u0000")}\u0001${activationKey}`;
      let solution = byActivation.get(dayKey);
      if (!solution) {
        const next = new Map<string, number>();
        const nextContributions = new Map<string, ImpactContribution[]>();
        for (const node of acyclicOrder) {
          const contributions: ImpactContribution[] = [];
          for (const edge of incomingByNode.get(node.id) ?? []) {
            const contribution = clamp01(
              (next.get(edge.from) ?? 0) *
                adjustedEdgeWeight(edge, bound, edgeEffects) *
                scenario.propagation.transmission,
            );
            if (contribution > 0) {
              contributions.push({
                edgeId: edge.id,
                fromNodeId: edge.from,
                contribution,
              });
            }
          }
          const baseBuffer = clamp01(numericProperty(node, "bufferShare", 0));
          const buffer = combineReduction(baseBuffer, nodeEffects.get(node.id) ?? 0);
          const propagated =
            combineImpacts(contributions.map((item) => item.contribution)) *
            (1 - buffer);
          const candidate = combineImpacts([
            directImpacts.get(node.id) ?? 0,
            propagated,
          ]);
          next.set(node.id, candidate);
          nextContributions.set(
            node.id,
            contributions
              .sort((left, right) => right.contribution - left.contribution)
              .slice(0, 8),
          );
        }
        solution = { impacts: next, contributions: nextContributions };
        byActivation.set(dayKey, solution);
      }
      for (const node of visible.nodes) {
        impacts.set(node.id, solution.impacts.get(node.id) ?? 0);
      }
      finalContributions = solution.contributions;
      dailyIterations = 1;
      dailyConverged = true;
    } else {
      for (
        let solverIteration = 1;
        solverIteration <= scenario.propagation.maxIterations;
        solverIteration += 1
      ) {
        dailyIterations = solverIteration;
        const next = new Map(impacts);
        const nextContributions = new Map<string, ImpactContribution[]>();
        let maximumChange = 0;
        for (const node of visible.nodes) {
          const contributions: ImpactContribution[] = [];
          for (const edge of incomingByNode.get(node.id) ?? []) {
            const contribution = clamp01(
              (impacts.get(edge.from) ?? 0) *
                adjustedEdgeWeight(edge, bound, edgeEffects) *
                scenario.propagation.transmission,
            );
            if (contribution > 0) {
              contributions.push({
                edgeId: edge.id,
                fromNodeId: edge.from,
                contribution,
              });
            }
          }
          const baseBuffer = clamp01(numericProperty(node, "bufferShare", 0));
          const buffer = combineReduction(baseBuffer, nodeEffects.get(node.id) ?? 0);
          const propagated =
            combineImpacts(contributions.map((item) => item.contribution)) *
            (1 - buffer);
          const candidate = combineImpacts([
            directImpacts.get(node.id) ?? 0,
            propagated,
          ]);
          const prior = impacts.get(node.id) ?? 0;
          next.set(node.id, candidate);
          maximumChange = Math.max(maximumChange, Math.abs(candidate - prior));
          nextContributions.set(
            node.id,
            contributions
              .sort((left, right) => right.contribution - left.contribution)
              .slice(0, 8),
          );
        }
        for (const [nodeId, value] of next) impacts.set(nodeId, value);
        finalContributions = nextContributions;
        if (maximumChange < scenario.propagation.tolerance) {
          dailyConverged = true;
          break;
        }
      }
    }
    solverIterations += dailyIterations;
    maxSolverIterationsUsed = Math.max(maxSolverIterationsUsed, dailyIterations);
    if (!dailyConverged) allDailySolvesConverged = false;

    for (const node of snapshot.nodes) {
      const value = visibleNodeIds.has(node.id) ? impacts.get(node.id) ?? 0 : 0;
      const direct = visibleNodeIds.has(node.id)
        ? directImpacts.get(node.id) ?? 0
        : 0;
      accumulatedImpacts.set(
        node.id,
        (accumulatedImpacts.get(node.id) ?? 0) + value,
      );
      accumulatedDirectImpacts.set(
        node.id,
        (accumulatedDirectImpacts.get(node.id) ?? 0) + direct,
      );
      if (value > (peakImpacts.get(node.id) ?? 0) + 1e-15) {
        peakImpacts.set(node.id, value);
        peakDirectImpacts.set(node.id, direct);
        contributionMap.set(node.id, finalContributions.get(node.id) ?? []);
      }
    }
    const elapsedDays = step + 1;
    if (horizonSet.has(elapsedDays)) {
      results.set(elapsedDays, buildResult(elapsedDays));
    }
  }
  return results;
}

function runPreparedCascade(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bound: BoundMode,
  horizonDays: number,
  prepared: PreparedCascade,
  options: CascadeRunOptions,
): CascadeResult {
  const result = runPreparedCascadeSeries(
    snapshot,
    scenario,
    bound,
    [horizonDays],
    prepared,
    options,
  ).get(horizonDays);
  if (!result) throw new Error(`Missing cascade result for ${horizonDays}-day horizon.`);
  return result;
}

export async function runCascadeAtHorizon(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bound: BoundMode,
  horizonDays: number,
  options: CascadeRunOptions = {},
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
    options,
  );
}

export async function runCascade(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bound: BoundMode,
  options: CascadeRunOptions = {},
): Promise<CascadeResult> {
  return runCascadeAtHorizon(
    snapshot,
    scenario,
    bound,
    Math.max(...scenario.propagation.horizonsDays),
    options,
  );
}

export async function runCascadeBounds(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  options: CascadeRunOptions = {},
): Promise<CascadeBounds> {
  await validateCascadeInputs(snapshot, scenario);
  const prepared = prepareCascade(snapshot, scenario);
  const horizonDays = [...scenario.propagation.horizonsDays].sort(
    (left, right) => left - right,
  );
  const series = {
    lower: runPreparedCascadeSeries(snapshot, scenario, "lower", horizonDays, prepared, options),
    central: runPreparedCascadeSeries(snapshot, scenario, "central", horizonDays, prepared, options),
    upper: runPreparedCascadeSeries(snapshot, scenario, "upper", horizonDays, prepared, options),
  };
  const horizons = horizonDays.map((days) => {
    const lower = series.lower.get(days);
    const central = series.central.get(days);
    const upper = series.upper.get(days);
    if (!lower || !central || !upper) {
      throw new Error(`Missing cascade bounds for ${days}-day horizon.`);
    }
    return { horizonDays: days, lower, central, upper };
  });
  const { lower, central, upper } = horizons[horizons.length - 1];
  const lowerByNode = new Map(lower.impacts.map((item) => [item.nodeId, item.impact]));
  const centralByNode = new Map(
    central.impacts.map((item) => [item.nodeId, item.impact]),
  );
  for (const upperImpact of upper.impacts) {
    const lowerImpact = lowerByNode.get(upperImpact.nodeId) ?? 0;
    const centralImpact = centralByNode.get(upperImpact.nodeId) ?? 0;
    if (
      lowerImpact > centralImpact + 1e-12 ||
      centralImpact > upperImpact.impact + 1e-12
    ) {
      throw new Error(`Non-monotone impact bounds for node ${upperImpact.nodeId}.`);
    }
  }
  return { lower, central, upper, horizons };
}
