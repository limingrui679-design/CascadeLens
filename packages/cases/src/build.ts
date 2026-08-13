import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  ASSUMPTION_REGISTER_DISCLAIMER,
  ASSUMPTION_REGISTER_SCHEMA_VERSION,
  analyzeInterventions,
  createRiskPack,
  dependencyCascadeModelCard,
  digestCanonical,
  runCascadeBounds,
  scoreReplay,
  sealSnapshot,
  sha256Text,
  stableStringify,
  valueObservations,
  verifyRiskPack,
  type AssumptionRegister,
  type CandidateObservation,
  type GraphSnapshotDraft,
  type ModelCard,
  type ShockScenario,
  type SourceRecord,
  type WorldEdge,
  type WorldNode,
} from "../../core/src/index";
import type { ReferenceCaseSpec } from "./specs";

const DECISION_CUTOFF = "2026-08-12T00:00:00Z";
const SHOCK_START = "2026-09-01T00:00:00Z";
const SHOCK_END = "2026-09-30T00:00:00Z";

function id(slug: string, kind: string, key: string): string {
  return `${kind}:${slug}:${key}`;
}

function assumptionUri(slug: string): string {
  return `https://github.com/limingrui679-design/CascadeLens/blob/main/content/cases/${slug}/assumptions.json`;
}

function contextRecord(spec: ReferenceCaseSpec) {
  return {
    title: spec.context.title,
    publisher: spec.context.publisher,
    uri: spec.context.uri,
    availableAt: spec.context.availableAt,
    role: "scenario_context_only",
  };
}

function assumptionsFor(
  spec: ReferenceCaseSpec,
  scenario: ShockScenario,
  graph: GraphSnapshotDraft,
  observationCandidates: CandidateObservation[],
): AssumptionRegister {
  const assumptionSourceId = id(spec.slug, "source", "assumptions");
  const labelById = new Map(graph.nodes.map((node) => [node.id, node.label]));
  return {
    schemaVersion: ASSUMPTION_REGISTER_SCHEMA_VERSION,
    scenarioId: spec.slug,
    generatedAt: DECISION_CUTOFF,
    status: "scenario_parameters_not_observations",
    assumptions: [
      {
        id: id(spec.slug, "assumption", "transmission"),
        parameterPath: "scenario.propagation.transmission",
        targetId: scenario.scenarioId,
        statement: "Propagation transmits a fixed share of upstream impact per iteration.",
        value: scenario.propagation.transmission,
        unit: "share",
        lower: 0,
        upper: 1,
        rationale: "A transparent stress parameter selected for sensitivity analysis, not fitted to outcomes.",
        sourceIds: [assumptionSourceId],
        status: "model_assumption",
      },
      ...graph.edges.map((edge, index) => ({
        id: id(spec.slug, "assumption", `graph-link-${index + 1}`),
        parameterPath: "graph.edges[].weight" as const,
        targetId: edge.id,
        statement: `Assumed dependency from ${labelById.get(edge.from)} to ${labelById.get(edge.to)}.`,
        value: edge.weight.value,
        unit: edge.weight.unit,
        lower: edge.weight.lower!,
        upper: edge.weight.upper!,
        rationale: "Illustrative topology parameter used only in the upper missing-graph bound.",
        sourceIds: [assumptionSourceId],
        status: "model_assumption" as const,
      })),
      ...observationCandidates.map((candidate, index) => ({
        id: id(spec.slug, "assumption", `candidate-link-${index + 1}`),
        parameterPath:
          "inputs.observation-candidates[].candidateEdge.weight" as const,
        targetId: candidate.candidateEdge.id,
        statement: `Assumed missing direct dependency tested by ${candidate.label}.`,
        value: candidate.candidateEdge.weight.value,
        unit: candidate.candidateEdge.weight.unit,
        lower: candidate.candidateEdge.weight.lower!,
        upper: candidate.candidateEdge.weight.upper!,
        rationale:
          "Illustrative candidate topology parameter used only for value-of-information analysis.",
        sourceIds: [assumptionSourceId],
        status: "model_assumption" as const,
      })),
    ],
    disclaimer: ASSUMPTION_REGISTER_DISCLAIMER,
  };
}

async function sourcesFor(
  spec: ReferenceCaseSpec,
  assumptionsText: string,
): Promise<SourceRecord[]> {
  const context = contextRecord(spec);
  return [
    {
      id: id(spec.slug, "source", "assumptions"),
      title: `${spec.title} local assumption register`,
      publisher: "CascadeLens",
      uri: assumptionUri(spec.slug),
      retrievedAt: DECISION_CUTOFF,
      availableAt: DECISION_CUTOFF,
      publishedAt: DECISION_CUTOFF,
      sha256: await sha256Text(assumptionsText),
      contentType: "application/json",
      artifactKind: "normalized_snapshot",
      digestScope: "exact_bytes",
      bytes: new TextEncoder().encode(assumptionsText).byteLength,
      role: "input",
      license: {
        mode: "redistributable",
        name: "Apache-2.0",
        termsUri: "https://www.apache.org/licenses/LICENSE-2.0",
        spdx: "Apache-2.0",
        notes: "Covers the locally authored assumption register, not the linked context page.",
      },
    },
    {
      id: id(spec.slug, "source", "context"),
      title: spec.context.title,
      publisher: spec.context.publisher,
      uri: spec.context.uri,
      retrievedAt: DECISION_CUTOFF,
      availableAt: spec.context.availableAt,
      publishedAt: spec.context.availableAt,
      sha256: await digestCanonical(context),
      contentType: "application/json",
      artifactKind: "citation_record",
      digestScope: "canonical_record",
      role: "context",
      license: {
        mode: "download_on_run",
        name: "Linked publisher terms apply",
        termsUri: spec.context.uri,
        notes: "Citation metadata only. The linked page is not redistributed and does not supply model weights.",
      },
    },
  ];
}

function nodesFor(spec: ReferenceCaseSpec): WorldNode[] {
  const assumptionSourceId = id(spec.slug, "source", "assumptions");
  return spec.stages.map((stage) => ({
    id: id(spec.slug, "node", stage.key),
    kind: stage.kind,
    label: stage.label,
    description: "Illustrative node in an explicitly assumed stress topology.",
    validFrom: DECISION_CUTOFF,
    observedAt: DECISION_CUTOFF,
    properties: {
      criticality: stage.criticality,
      bufferShare: 0,
      factualStatus: "model_construct",
    },
    evidence: {
      grade: "MODEL_INFERRED",
      confidence: 0.35,
      sourceIds: [assumptionSourceId],
      reviewStatus: "not_required",
    },
  }));
}

function edgeFor(
  spec: ReferenceCaseSpec,
  index: number,
  from: number,
  to: number,
): WorldEdge {
  const weight = spec.linkWeights[index % spec.linkWeights.length];
  return {
    id: id(spec.slug, "edge", `link-${index + 1}`),
    from: id(spec.slug, "node", spec.stages[from].key),
    to: id(spec.slug, "node", spec.stages[to].key),
    relation: "depends_on",
    weight: {
      value: weight,
      lower: Math.max(0, Number((weight - 0.2).toFixed(3))),
      upper: Math.min(1, Number((weight + 0.16).toFixed(3))),
      unit: "share",
    },
    validFrom: DECISION_CUTOFF,
    observedAt: DECISION_CUTOFF,
    properties: {
      factualStatus: "model_assumption",
      eligibleForPrimaryEstimate: false,
    },
    evidence: {
      grade: "MODEL_INFERRED",
      confidence: 0.3,
      sourceIds: [id(spec.slug, "source", "assumptions")],
      reviewStatus: "not_required",
    },
  };
}

function graphDraft(spec: ReferenceCaseSpec, sources: SourceRecord[]): GraphSnapshotDraft {
  const topology = spec.topology ?? "chain";
  let edges: WorldEdge[];
  if (topology === "branch_merge") {
    edges = [
      edgeFor(spec, 0, 0, 1),
      edgeFor(spec, 1, 0, 2),
      edgeFor(spec, 2, 1, 3),
      edgeFor(spec, 3, 2, 3),
      edgeFor(spec, 4, 3, 4),
    ];
  } else if (topology === "cycle") {
    edges = [
      edgeFor(spec, 0, 0, 1),
      edgeFor(spec, 1, 1, 2),
      edgeFor(spec, 2, 2, 3),
      edgeFor(spec, 3, 3, 4),
      edgeFor(spec, 4, 3, 1),
    ];
  } else {
    edges = [
      edgeFor(spec, 0, 0, 1),
      edgeFor(spec, 1, 1, 2),
      edgeFor(spec, 2, 2, 3),
      edgeFor(spec, 3, 3, 4),
    ];
  }
  if (topology === "dynamic_activation") {
    edges[2] = {
      ...edges[2],
      validFrom: "2026-09-15T00:00:00Z",
      properties: {
        ...edges[2].properties,
        temporalPattern: "activates_during_horizon",
      },
    };
  }
  if (topology === "dynamic_expiry") {
    edges[2] = {
      ...edges[2],
      validTo: "2026-09-15T00:00:00Z",
      properties: {
        ...edges[2].properties,
        temporalPattern: "expires_during_horizon",
      },
    };
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshotId: id(spec.slug, "snapshot", "assumed-topology"),
    title: `${spec.title} assumed topology`,
    decisionCutoff: DECISION_CUTOFF,
    generatedAt: DECISION_CUTOFF,
    sources,
    nodes: nodesFor(spec),
    edges,
  };
}

function scenarioFor(spec: ReferenceCaseSpec): ShockScenario {
  const sourceId = id(spec.slug, "source", "context");
  const shocks: ShockScenario["shocks"] = [
    {
      id: id(spec.slug, "shock", "primary"),
      label: spec.shockLabel,
      target: { ids: [id(spec.slug, "node", spec.stages[0].key)] },
      operation: spec.shockOperation,
      magnitude: spec.shockMagnitude,
      unit: "share",
      startsAt: SHOCK_START,
      endsAt: SHOCK_END,
      rationale:
        "Forward-dated stress inspired by the context reference; timing and magnitude are explicit scenario parameters.",
      sourceIds: [sourceId],
    },
  ];
  if (spec.slug === "ukraine-commodity-compound-restress" || spec.slug === "food-export-compound-stress") {
    shocks.push({
      id: id(spec.slug, "shock", "secondary"),
      label: "Concurrent policy restriction",
      target: { ids: [id(spec.slug, "node", spec.stages[2].key)] },
      operation: "policy_restrict",
      magnitude: 0.35,
      unit: "share",
      startsAt: SHOCK_START,
      endsAt: SHOCK_END,
      rationale: "Explicit compound-stress assumption; not a statement about a current policy.",
      sourceIds: [sourceId],
    });
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    scenarioId: spec.slug,
    title: spec.title,
    summary: spec.summary,
    classification: spec.classification,
    decisionCutoff: DECISION_CUTOFF,
    graphSnapshotId: id(spec.slug, "snapshot", "assumed-topology"),
    shocks,
    propagation: {
      engine: "dependency_cascade",
      transmission: 0.82,
      maxIterations: 100,
      tolerance: 1e-9,
      horizonsDays: spec.horizonsDays ?? [7, 30, 90],
      bounds: ["lower", "central", "upper"],
    },
    interventions: spec.interventions.map((intervention) => ({
      id: id(spec.slug, "intervention", intervention.key),
      label: intervention.label,
      type: intervention.type,
      targetNodeIds:
        intervention.targetStage === undefined
          ? []
          : [id(spec.slug, "node", spec.stages[intervention.targetStage].key)],
      targetEdgeIds:
        intervention.targetLink === undefined
          ? []
          : [id(spec.slug, "edge", `link-${intervention.targetLink + 1}`)],
      cost: intervention.cost,
      costUnit: "normalized_cost",
      leadTimeDays: intervention.leadTimeDays,
      effect: intervention.effect,
      evidenceGrade: "MODEL_INFERRED",
      rationale: "Illustrative intervention parameter; feasibility does not imply operational suitability.",
    })),
    objectives: [
      { id: id(spec.slug, "objective", "risk"), metric: "residual_impact", sense: "minimize" },
      { id: id(spec.slug, "objective", "cost"), metric: "cost", sense: "minimize" },
    ],
    constraints: {
      budget: spec.constraints?.budget ?? 22,
      budgetUnit: "normalized_cost",
      maxInterventions: spec.constraints?.maxInterventions ?? 2,
      maxLeadTimeDays: spec.constraints?.maxLeadTimeDays ?? 60,
    },
    limitations: [
      "Scenario-only reference case; it has not been compared with separated real-world outcomes.",
      "All graph links, weights, shock magnitudes, costs, and intervention effects are explicit model assumptions.",
      "Outputs are not forecasts, causal estimates, realized losses, or evidence of external use.",
      spec.specificLimitation,
    ],
  };
}

function observationCandidate(spec: ReferenceCaseSpec): CandidateObservation {
  return {
    id: id(spec.slug, "candidate", "direct-link"),
    label: `Verify a possible direct dependency from ${spec.stages[0].label} to ${spec.stages[4].label}`,
    probabilityPresent: 0.35,
    acquisitionCost: 3,
    acquisitionCostUnit: "normalized_cost",
    candidateEdge: edgeFor(spec, 99, 0, 4),
  };
}

export interface BuiltReferenceCase {
  spec: ReferenceCaseSpec;
  assumptions: AssumptionRegister;
  assumptionsText: string;
  contextCitation: ReturnType<typeof contextRecord>;
  snapshot: Awaited<ReturnType<typeof sealSnapshot>>;
  scenario: ShockScenario;
  bounds: Awaited<ReturnType<typeof runCascadeBounds>>;
  interventions: Awaited<ReturnType<typeof analyzeInterventions>>;
  observability: Awaited<ReturnType<typeof valueObservations>>;
  benchmark: ReturnType<typeof scoreReplay>;
  modelCard: ModelCard;
  riskPack: Awaited<ReturnType<typeof createRiskPack>>;
  verificationIssues: string[];
}

export async function buildReferenceCase(
  spec: ReferenceCaseSpec,
): Promise<BuiltReferenceCase> {
  const scenario = scenarioFor(spec);
  const observationCandidates = [observationCandidate(spec)];
  const draft = graphDraft(spec, []);
  const assumptions = assumptionsFor(
    spec,
    scenario,
    draft,
    observationCandidates,
  );
  const assumptionsText = stableStringify(assumptions, 2) + "\n";
  const sources = await sourcesFor(spec, assumptionsText);
  const snapshot = await sealSnapshot({ ...draft, sources });
  const bounds = await runCascadeBounds(snapshot, scenario);
  const interventions = await analyzeInterventions(snapshot, scenario);
  const benchmarkOutcomes: never[] = [];
  const riskValuePerUnit = 100;
  const observability = await valueObservations(
    snapshot,
    scenario,
    observationCandidates,
    riskValuePerUnit,
  );
  const benchmark = scoreReplay(snapshot, scenario, bounds, benchmarkOutcomes);
  const modelCard = dependencyCascadeModelCard(scenario, benchmark);
  const riskPack = await createRiskPack({
    packId: id(spec.slug, "riskpack", `engine-v${ENGINE_VERSION}`),
    generatedAt: DECISION_CUTOFF,
    snapshot,
    scenario,
    bounds,
    interventionAnalysis: interventions,
    benchmark,
    assumptions,
    modelCard,
    observationValues: observability,
    observationCandidates,
    benchmarkOutcomes,
    riskValuePerUnit,
    rebuildCommand: `npm run cascadelens -- cases build ${spec.slug}`,
  });
  return {
    spec,
    assumptions,
    assumptionsText,
    contextCitation: contextRecord(spec),
    snapshot,
    scenario,
    bounds,
    interventions,
    observability,
    benchmark,
    modelCard,
    riskPack,
    verificationIssues: await verifyRiskPack(riskPack),
  };
}

export function caseCatalogRecord(built: BuiltReferenceCase) {
  const { spec, snapshot, bounds, interventions, benchmark, observability } = built;
  return {
    slug: spec.slug,
    title: spec.title,
    shortTitle: spec.shortTitle,
    domain: spec.domain,
    classification: spec.classification,
    summary: spec.summary,
    decisionQuestion: spec.decisionQuestion,
    tags: spec.tags,
    context: spec.context,
    evidenceBoundary:
      "Context-only public reference; all topology and numeric parameters are explicit model assumptions.",
    scoringStatus: benchmark.status,
    nodeCount: snapshot.nodes.length,
    edgeCount: snapshot.edges.length,
    structuralProfile: {
      topology: spec.topology ?? "chain",
      horizonsDays: scenarioFor(spec).propagation.horizonsDays,
      dynamicEdgeCount: snapshot.edges.filter(
        (edge) => edge.validFrom !== DECISION_CUTOFF || edge.validTo !== undefined,
      ).length,
      hasCycle: (spec.topology ?? "chain") === "cycle",
      constraintProfile: scenarioFor(spec).constraints,
    },
    snapshotDigest: snapshot.contentDigest,
    totalWeightedImpact: {
      lower: bounds.lower.totalWeightedImpact,
      central: bounds.central.totalWeightedImpact,
      upper: bounds.upper.totalWeightedImpact,
    },
    recommendationStatus: interventions.recommendationStatus,
    recommendedBundleIds: interventions.recommendedBundleIds,
    observabilityStatus: observability[0]?.status ?? "insufficient_model",
    riskPackPath: `cases/${spec.slug}/riskpack/`,
    rebuildCommand: `npm run cascadelens -- cases build ${spec.slug}`,
  };
}
