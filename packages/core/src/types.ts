export const SCHEMA_VERSION = "0.1.0" as const;
export const ENGINE_VERSION = "0.2.0" as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const evidenceGrades = [
  "OFFICIAL_OBSERVED",
  "ENTITY_REPORTED",
  "THIRD_PARTY_VERIFIED",
  "TEXT_EXTRACTED",
  "MODEL_INFERRED",
] as const;

export type EvidenceGrade = (typeof evidenceGrades)[number];
export type EvidenceUse = "primary" | "bounded" | "retrieval";
export type ReviewStatus = "not_required" | "pending" | "verified" | "rejected";

export const nodeKinds = [
  "country",
  "region",
  "product",
  "industry",
  "legal_entity",
  "facility",
  "port",
  "route",
  "security",
  "fund",
  "medicine",
  "policy",
  "event",
  "metric",
] as const;

export type NodeKind = (typeof nodeKinds)[number];

export const relationKinds = [
  "trades_to",
  "supplies",
  "inputs_to",
  "depends_on",
  "owns",
  "holds",
  "located_in",
  "connects_to",
  "substitute_for",
  "regulated_by",
  "exposed_to",
  "disclosed_relation",
] as const;

export type RelationKind = (typeof relationKinds)[number];
export type RedistributionMode =
  | "redistributable"
  | "download_on_run"
  | "user_provided";
export type SourceRole = "input" | "context" | "outcome";
export type SourceArtifactKind =
  | "raw_snapshot"
  | "normalized_snapshot"
  | "query_manifest"
  | "citation_record";
export type DigestScope = "exact_bytes" | "canonical_record";

export interface LicenseRecord {
  mode: RedistributionMode;
  name: string;
  termsUri: string;
  spdx?: string;
  notes?: string;
}

export interface SourceRecord {
  id: string;
  title: string;
  publisher: string;
  uri: string;
  retrievedAt: string;
  availableAt: string;
  publishedAt?: string;
  sha256: string;
  contentType: string;
  artifactKind: SourceArtifactKind;
  digestScope: DigestScope;
  bytes?: number;
  role: SourceRole;
  license: LicenseRecord;
}

export interface TemporalRecord {
  validFrom: string;
  validTo?: string;
  observedAt: string;
  supersededAt?: string;
}

export interface EvidenceRecord {
  grade: EvidenceGrade;
  confidence: number;
  sourceIds: string[];
  reviewStatus: ReviewStatus;
  reviewRecordId?: string;
}

export interface WorldNode extends TemporalRecord {
  id: string;
  kind: NodeKind;
  label: string;
  description?: string;
  jurisdiction?: string;
  properties: Record<string, JsonValue>;
  evidence: EvidenceRecord;
}

export interface BoundedValue {
  value: number;
  unit: string;
  lower?: number;
  upper?: number;
}

export interface WorldEdge extends TemporalRecord {
  id: string;
  from: string;
  to: string;
  relation: RelationKind;
  weight: BoundedValue;
  properties: Record<string, JsonValue>;
  evidence: EvidenceRecord;
}

export interface GraphSnapshot {
  schemaVersion: typeof SCHEMA_VERSION;
  snapshotId: string;
  title: string;
  decisionCutoff: string;
  generatedAt: string;
  contentDigest: string;
  nodes: WorldNode[];
  edges: WorldEdge[];
  sources: SourceRecord[];
}

export interface GraphSnapshotDraft
  extends Omit<GraphSnapshot, "contentDigest"> {
  contentDigest?: never;
}

export type ScenarioClassification =
  | "historical_replay"
  | "quasi_historical"
  | "synthetic_stress";

export const shockOperations = [
  "multiply_capacity",
  "reduce_supply",
  "increase_demand",
  "add_cost",
  "disable",
  "policy_restrict",
  "financial_stress",
] as const;

export type ShockOperation = (typeof shockOperations)[number];

export interface ShockTarget {
  ids?: string[];
  edgeIds?: string[];
  kind?: NodeKind;
  relation?: RelationKind;
  jurisdiction?: string;
  propertyEquals?: { key: string; value: JsonPrimitive };
}

export interface ShockDefinition {
  id: string;
  label: string;
  target: ShockTarget;
  operation: ShockOperation;
  magnitude: number;
  unit: string;
  startsAt: string;
  endsAt?: string;
  rationale: string;
  sourceIds: string[];
}

export type BoundMode = "lower" | "central" | "upper";

export interface PropagationConfig {
  engine: string;
  transmission: number;
  /** Maximum fixed-point solver iterations for each event-time day. */
  maxIterations: number;
  /** Per-day fixed-point convergence tolerance. */
  tolerance: number;
  horizonsDays: number[];
  bounds: BoundMode[];
}

export const interventionTypes = [
  "buffer",
  "diversify",
  "reroute",
  "reserve_release",
  "demand_management",
  "evidence_acquisition",
] as const;

export type InterventionType = (typeof interventionTypes)[number];

export interface InterventionDefinition {
  id: string;
  label: string;
  type: InterventionType;
  targetNodeIds: string[];
  targetEdgeIds: string[];
  cost: number;
  costUnit: string;
  leadTimeDays: number;
  effect: number;
  mutuallyExclusiveGroup?: string;
  evidenceGrade: EvidenceGrade;
  rationale: string;
}

export interface ObjectiveDefinition {
  id: string;
  metric: "residual_impact" | "cost" | "concentration" | "unmet_demand";
  sense: "minimize" | "maximize";
  weight?: number;
  threshold?: number;
}

export interface ScenarioConstraints {
  budget?: number;
  budgetUnit?: string;
  maxInterventions?: number;
  maxLeadTimeDays?: number;
}

export interface ShockScenario {
  schemaVersion: typeof SCHEMA_VERSION;
  scenarioId: string;
  title: string;
  summary: string;
  classification: ScenarioClassification;
  decisionCutoff: string;
  graphSnapshotId: string;
  shocks: ShockDefinition[];
  propagation: PropagationConfig;
  interventions: InterventionDefinition[];
  objectives: ObjectiveDefinition[];
  constraints: ScenarioConstraints;
  limitations: string[];
}

export interface ImpactContribution {
  edgeId: string;
  fromNodeId: string;
  contribution: number;
}

export interface NodeImpact {
  nodeId: string;
  /** Time-weighted mean impact across every simulated day in the horizon. */
  impact: number;
  /** Largest impact reached on any simulated day. */
  peakImpact: number;
  /** Impact at the end of the requested horizon. */
  endImpact: number;
  /** Time-weighted mean direct-shock component. */
  directImpact: number;
  /** Largest direct-shock component reached on any simulated day. */
  peakDirectImpact: number;
  /** Incoming contributions at the node's peak-impact day. */
  contributions: ImpactContribution[];
}

export interface CascadeResult {
  engineVersion: typeof ENGINE_VERSION;
  scenarioId: string;
  snapshotDigest: string;
  bound: BoundMode;
  metric: "time_weighted_mean_node_impact";
  horizonDays: number;
  /** True only when every daily fixed-point solve met tolerance. */
  converged: boolean;
  /** Total fixed-point solver iterations across all simulated days. */
  iterations: number;
  /** Number of event-time days evaluated for this result. */
  simulatedDays: number;
  /** Largest fixed-point iteration count used by any single day. */
  maxSolverIterationsUsed: number;
  /** Criticality-weighted mean of each node's time-weighted mean impact. */
  totalWeightedImpact: number;
  /** Criticality-weighted envelope of each node's within-horizon peak. */
  totalWeightedPeakEnvelope: number;
  /** Criticality-weighted impact at the final simulated day. */
  endWeightedImpact: number;
  impacts: NodeImpact[];
  excludedEdgeCounts: Record<EvidenceGrade, number>;
  warnings: string[];
}

export interface CascadeBounds {
  lower: CascadeResult;
  central: CascadeResult;
  upper: CascadeResult;
  horizons: HorizonCascadeBounds[];
}

export interface HorizonCascadeBounds {
  horizonDays: number;
  lower: CascadeResult;
  central: CascadeResult;
  upper: CascadeResult;
}

export interface FlowConservationIssue {
  nodeId: string;
  relation: "depends_on" | "inputs_to" | "supplies";
  bound: BoundMode;
  incomingShare: number;
  excess: number;
}

export interface CascadeEnginePlugin {
  id: string;
  version: string;
  run(
    snapshot: GraphSnapshot,
    scenario: ShockScenario,
    bound: BoundMode,
  ): Promise<CascadeResult>;
}

export interface InterventionBundleResult {
  interventionIds: string[];
  strategy: "do_not_act" | "intervene";
  cost: number;
  feasible: boolean;
  lowerImpact: number | null;
  centralImpact: number | null;
  upperImpact: number | null;
  worstCaseImpact: number | null;
  activationSchedule: Array<{
    interventionId: string;
    activationAt: string;
    leadTimeDays: number;
  }>;
  horizonResults: Array<{
    horizonDays: number;
    lowerImpact: number | null;
    centralImpact: number | null;
    upperImpact: number | null;
    worstCaseImpact: number | null;
    activeInterventionIds: string[];
    pendingInterventionIds: string[];
  }>;
  reasons: string[];
}

export interface InterventionAnalysis {
  scenarioId: string;
  evaluatedBundles: InterventionBundleResult[];
  paretoFrontier: InterventionBundleResult[];
  baselineBundle: InterventionBundleResult;
  recommendedBundleIds: string[];
  recommendationStatus: "eligible" | "evidence_required" | "blocked";
  horizonAnalyses: Array<{
    horizonDays: number;
    paretoFrontier: InterventionBundleResult[];
    recommendedBundleIds: string[];
    recommendationStatus: "eligible" | "evidence_required" | "blocked";
  }>;
  reversalThresholds: Array<{
    parameter: string;
    threshold: number;
    fromBundleIds: string[];
    toBundleIds: string[];
  }>;
}

export interface CandidateObservation {
  id: string;
  label: string;
  candidateEdge: WorldEdge;
  probabilityPresent: number;
  acquisitionCost: number;
  acquisitionCostUnit: string;
}

export interface ObservationValue {
  candidateId: string;
  label: string;
  expectedValueOfPerfectInformation: number;
  acquisitionCost: number;
  netValue: number;
  expectedWorstCaseImpactReduction: number;
  expectedDecisionUncertaintyReduction: number;
  probabilityDecisionChanges: number;
  status: "worth_acquiring" | "not_cost_effective" | "insufficient_model";
}

export interface OutcomeObservation {
  nodeId: string;
  observedImpact: number;
  sourceId: string;
  targetMetric: "time_weighted_mean_node_impact";
  horizonDays: number;
  /** Start of the event-time window represented by observedImpact. */
  windowStart: string;
  /** End of the complete event-time window represented by observedImpact. */
  windowEnd: string;
  /** Earliest time the frozen outcome value was available to the evaluator. */
  availableAt: string;
}

export interface BenchmarkResult {
  scenarioId: string;
  classification: ScenarioClassification;
  status: "historically_scored" | "scenario_only" | "blocked";
  sampleSize: number;
  meanAbsoluteError?: number;
  spearmanRank?: number;
  intervalCoverage?: number;
  meanIntervalWidth?: number;
  empiricalCoverageCalibrationError?: number;
  directionAccuracy?: number;
  meanRegretVersusZeroBaseline?: number;
  targetMetric?: OutcomeObservation["targetMetric"];
  horizonDays?: number;
  outcomeWindow?: { start: string; end: string };
  leakageIssues: string[];
  limitations: string[];
}

export interface AssumptionRecord {
  id: string;
  statement: string;
  value: JsonValue;
  unit?: string;
  lower?: number;
  upper?: number;
  rationale: string;
  sourceIds: string[];
  status: "model_assumption";
}

export interface AssumptionRegister {
  scenarioId: string;
  generatedAt: string;
  status: "scenario_parameters_not_observations";
  assumptions: AssumptionRecord[];
  disclaimer: string;
}

export interface ModelCard {
  modelId: string;
  version: typeof ENGINE_VERSION;
  intendedUse: string[];
  outOfScope: string[];
  algorithm: string;
  evidencePolicy: string;
  validationStatus:
    | "software_verified_empirically_unvalidated"
    | "historically_scored";
  limitations: string[];
}

export interface RiskPackManifest {
  schemaVersion: typeof SCHEMA_VERSION;
  engineVersion: typeof ENGINE_VERSION;
  packId: string;
  scenarioId: string;
  classification: ScenarioClassification;
  generatedAt: string;
  snapshotDigest: string;
  verificationMode: "recomputed";
  files: string[];
  truthfulStatus: Array<
    | "observed"
    | "entity_reported"
    | "third_party_verified"
    | "text_extracted"
    | "model_inferred"
    | "historically_scored"
    | "scenario_only"
  >;
}

export interface RiskPack {
  manifest: RiskPackManifest;
  files: Record<string, string>;
  checksums: Record<string, string>;
}
