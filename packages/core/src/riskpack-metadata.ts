import { compareCanonicalStrings, sha256Text, stableStringify } from "./canonical";
import { isIsoDateTime } from "./temporal";
import {
  ENGINE_VERSION,
  ASSUMPTION_REGISTER_SCHEMA_VERSION,
  MODEL_CARD_SCHEMA_VERSION,
  RISKPACK_LIMITATIONS_SCHEMA_VERSION,
  type AssumptionRecord,
  type AssumptionRegister,
  type BenchmarkResult,
  type CandidateObservation,
  type GraphSnapshot,
  type ModelCard,
  type ShockScenario,
} from "./types";

export const ASSUMPTION_REGISTER_DISCLAIMER =
  "Every numeric value in this register is a scenario assumption. It is not an observed flow, calibrated forecast, causal effect, or realized loss.";

export const RISKPACK_LIMITATIONS_DISCLAIMER =
  "Scenario outputs are not causal estimates, realized losses, investment advice, legal advice, clinical advice, or evidence of adoption.";

const intendedUse = [
  "Transparent stress-topology exploration",
  "Software and evidence-governance verification",
  "Comparing explicitly parameterized intervention bundles",
];

const outOfScope = [
  "Forecasting realized losses",
  "Causal inference",
  "Autonomous operational decisions",
  "Investment, legal, sanctions-compliance, clinical, or emergency-response advice",
];

const algorithm =
  "Cycle-safe deterministic dependency propagation with evidence-gated lower, central, and upper graph bounds.";

const evidencePolicy =
  "MODEL_INFERRED edges are excluded from lower and central estimates and enter only the upper missing-graph envelope.";

export interface RiskPackLimitations {
  schemaVersion: typeof RISKPACK_LIMITATIONS_SCHEMA_VERSION;
  scenarioLimitations: string[];
  benchmarkLimitations: string[];
  disclaimer: typeof RISKPACK_LIMITATIONS_DISCLAIMER;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

export function riskPackLimitations(
  scenario: ShockScenario,
  benchmark: BenchmarkResult,
): RiskPackLimitations {
  return {
    schemaVersion: RISKPACK_LIMITATIONS_SCHEMA_VERSION,
    scenarioLimitations: [...scenario.limitations],
    benchmarkLimitations: [...benchmark.limitations],
    disclaimer: RISKPACK_LIMITATIONS_DISCLAIMER,
  };
}

export function dependencyCascadeModelCard(
  scenario: ShockScenario,
  benchmark: BenchmarkResult,
): ModelCard {
  return {
    schemaVersion: MODEL_CARD_SCHEMA_VERSION,
    modelId: scenario.propagation.engine,
    version: ENGINE_VERSION,
    intendedUse: [...intendedUse],
    outOfScope: [...outOfScope],
    algorithm,
    evidencePolicy,
    validationStatus:
      benchmark.status === "historically_scored"
        ? "historically_scored"
        : "software_verified_empirically_unvalidated",
    limitations: uniqueStrings([
      ...scenario.limitations,
      ...benchmark.limitations,
    ]),
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: UnknownRecord, expected: string[]): boolean {
  return (
    stableStringify(Object.keys(value).sort(compareCanonicalStrings)) ===
    stableStringify([...expected].sort(compareCanonicalStrings))
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(nonEmptyString) &&
    new Set(value).size === value.length
  );
}

function sameNumber(left: unknown, right: unknown): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && left === right;
}

interface BoundParameter {
  value: number;
  lower: number;
  upper: number;
  unit: string;
}

function bindingKey(parameterPath: string, targetId: string): string {
  return `${parameterPath}\u0000${targetId}`;
}

function expectedBindings(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  candidates: CandidateObservation[],
): Map<string, BoundParameter> {
  const expected = new Map<string, BoundParameter>();
  expected.set(
    bindingKey("scenario.propagation.transmission", scenario.scenarioId),
    {
      value: scenario.propagation.transmission,
      lower: 0,
      upper: 1,
      unit: "share",
    },
  );
  for (const edge of snapshot.edges.filter(
    (item) => item.evidence.grade === "MODEL_INFERRED",
  )) {
    if (
      Number.isFinite(edge.weight.lower) &&
      Number.isFinite(edge.weight.upper)
    ) {
      expected.set(bindingKey("graph.edges[].weight", edge.id), {
        value: edge.weight.value,
        lower: edge.weight.lower!,
        upper: edge.weight.upper!,
        unit: edge.weight.unit,
      });
    }
  }
  for (const candidate of candidates) {
    const weight = candidate.candidateEdge.weight;
    if (Number.isFinite(weight.lower) && Number.isFinite(weight.upper)) {
      expected.set(
        bindingKey(
          "inputs.observation-candidates[].candidateEdge.weight",
          candidate.candidateEdge.id,
        ),
        {
          value: weight.value,
          lower: weight.lower!,
          upper: weight.upper!,
          unit: weight.unit,
        },
      );
    }
  }
  return expected;
}

function assumptionStructureIssues(value: unknown): string[] {
  const issues: string[] = [];
  if (!isRecord(value)) return ["invalid_assumption_register_schema"];
  if (
    !hasExactKeys(value, [
      "scenarioId",
      "schemaVersion",
      "generatedAt",
      "status",
      "assumptions",
      "disclaimer",
    ])
  ) {
    issues.push("invalid_assumption_register_schema");
  }
  if (value.schemaVersion !== ASSUMPTION_REGISTER_SCHEMA_VERSION) {
    issues.push("assumption_register_schema_version_mismatch");
  }
  if (!nonEmptyString(value.scenarioId)) issues.push("invalid_assumption_scenario_id");
  if (
    typeof value.generatedAt !== "string" ||
    !isIsoDateTime(value.generatedAt)
  ) {
    issues.push("invalid_assumption_generated_at");
  }
  if (value.status !== "scenario_parameters_not_observations") {
    issues.push("invalid_assumption_status");
  }
  if (value.disclaimer !== ASSUMPTION_REGISTER_DISCLAIMER) {
    issues.push("assumption_disclaimer_mismatch");
  }
  if (!Array.isArray(value.assumptions) || value.assumptions.length === 0) {
    issues.push("invalid_assumption_records");
    return issues;
  }
  for (const record of value.assumptions) {
    if (
      !isRecord(record) ||
      !hasExactKeys(record, [
        "id",
        "parameterPath",
        "targetId",
        "statement",
        "value",
        "unit",
        "lower",
        "upper",
        "rationale",
        "sourceIds",
        "status",
      ]) ||
      !nonEmptyString(record.id) ||
      ![
        "scenario.propagation.transmission",
        "graph.edges[].weight",
        "inputs.observation-candidates[].candidateEdge.weight",
      ].includes(String(record.parameterPath)) ||
      !nonEmptyString(record.targetId) ||
      !nonEmptyString(record.statement) ||
      !Number.isFinite(record.value) ||
      !nonEmptyString(record.unit) ||
      !Number.isFinite(record.lower) ||
      !Number.isFinite(record.upper) ||
      (record.lower as number) > (record.value as number) ||
      (record.value as number) > (record.upper as number) ||
      !nonEmptyString(record.rationale) ||
      !nonEmptyStringArray(record.sourceIds) ||
      record.status !== "model_assumption"
    ) {
      issues.push("invalid_assumption_record_schema");
    }
  }
  return issues;
}

function modelCardStructureIssues(value: unknown): string[] {
  if (!isRecord(value)) return ["invalid_model_card_schema"];
  const issues: string[] = [];
  if (
    !hasExactKeys(value, [
      "modelId",
      "schemaVersion",
      "version",
      "intendedUse",
      "outOfScope",
      "algorithm",
      "evidencePolicy",
      "validationStatus",
      "limitations",
    ]) ||
    value.schemaVersion !== MODEL_CARD_SCHEMA_VERSION ||
    !nonEmptyString(value.modelId) ||
    value.version !== ENGINE_VERSION ||
    !nonEmptyStringArray(value.intendedUse) ||
    !nonEmptyStringArray(value.outOfScope) ||
    !nonEmptyString(value.algorithm) ||
    !nonEmptyString(value.evidencePolicy) ||
    ![
      "software_verified_empirically_unvalidated",
      "historically_scored",
    ].includes(String(value.validationStatus)) ||
    !nonEmptyStringArray(value.limitations)
  ) {
    issues.push("invalid_model_card_schema");
  }
  return issues;
}

function limitationsStructureIssues(value: unknown): string[] {
  if (!isRecord(value)) return ["invalid_limitations_schema"];
  if (
    !hasExactKeys(value, [
      "scenarioLimitations",
      "schemaVersion",
      "benchmarkLimitations",
      "disclaimer",
    ]) ||
    value.schemaVersion !== RISKPACK_LIMITATIONS_SCHEMA_VERSION ||
    !nonEmptyStringArray(value.scenarioLimitations) ||
    !nonEmptyStringArray(value.benchmarkLimitations) ||
    value.disclaimer !== RISKPACK_LIMITATIONS_DISCLAIMER
  ) {
    return ["invalid_limitations_schema"];
  }
  return [];
}

export interface RiskPackMetadataInput {
  assumptions: unknown;
  assumptionsText: string;
  modelCard: unknown;
  limitations: unknown;
  snapshot: GraphSnapshot;
  scenario: ShockScenario;
  benchmark: BenchmarkResult;
  observationCandidates: CandidateObservation[];
}

export async function validateRiskPackMetadata(
  input: RiskPackMetadataInput,
): Promise<string[]> {
  const issues = [
    ...assumptionStructureIssues(input.assumptions),
    ...modelCardStructureIssues(input.modelCard),
    ...limitationsStructureIssues(input.limitations),
  ];
  if (!isRecord(input.assumptions) || !Array.isArray(input.assumptions.assumptions)) {
    return [...new Set(issues)].sort(compareCanonicalStrings);
  }
  const assumptions = input.assumptions as unknown as AssumptionRegister;
  if (assumptions.scenarioId !== input.scenario.scenarioId) {
    issues.push("assumptions_scenario_id_mismatch");
  }

  const qualifyingSources = input.snapshot.sources.filter(
    (source) =>
      source.role === "input" &&
      source.artifactKind === "normalized_snapshot" &&
      source.digestScope === "exact_bytes" &&
      source.contentType === "application/json" &&
      /(?:^|\/)assumptions\.json(?:$|[?#])/.test(source.uri),
  );
  if (qualifyingSources.length !== 1) {
    issues.push("assumption_artifact_source_count_mismatch");
  } else {
    const source = qualifyingSources[0];
    const bytes = new TextEncoder().encode(input.assumptionsText).byteLength;
    if (source.sha256 !== await sha256Text(input.assumptionsText)) {
      issues.push("assumption_artifact_digest_mismatch");
    }
    if (source.bytes !== bytes) issues.push("assumption_artifact_bytes_mismatch");
    for (const record of assumptions.assumptions) {
      if (
        !Array.isArray(record.sourceIds) ||
        record.sourceIds.length !== 1 ||
        record.sourceIds[0] !== source.id
      ) {
        issues.push("assumption_source_binding_mismatch");
      }
    }
  }

  const expected = expectedBindings(
    input.snapshot,
    input.scenario,
    input.observationCandidates,
  );
  const seenBindings = new Set<string>();
  const seenIds = new Set<string>();
  for (const record of assumptions.assumptions as AssumptionRecord[]) {
    if (!isRecord(record)) continue;
    if (seenIds.has(record.id)) issues.push("duplicate_assumption_id");
    seenIds.add(record.id);
    const key = bindingKey(String(record.parameterPath), String(record.targetId));
    if (seenBindings.has(key)) issues.push("duplicate_assumption_binding");
    seenBindings.add(key);
    const parameter = expected.get(key);
    if (!parameter) {
      issues.push(`unknown_assumption_binding:${record.id}`);
      continue;
    }
    if (
      !sameNumber(record.value, parameter.value) ||
      !sameNumber(record.lower, parameter.lower) ||
      !sameNumber(record.upper, parameter.upper) ||
      record.unit !== parameter.unit
    ) {
      issues.push(`assumption_value_binding_mismatch:${record.id}`);
    }
  }
  for (const key of expected.keys()) {
    if (!seenBindings.has(key)) issues.push(`missing_assumption_binding:${key.replace("\u0000", ":")}`);
  }

  const expectedCard = dependencyCascadeModelCard(input.scenario, input.benchmark);
  if (stableStringify(input.modelCard) !== stableStringify(expectedCard)) {
    issues.push("model_card_semantic_mismatch");
  }
  const expectedLimitations = riskPackLimitations(input.scenario, input.benchmark);
  if (stableStringify(input.limitations) !== stableStringify(expectedLimitations)) {
    issues.push("limitations_semantic_mismatch");
  }
  return [...new Set(issues)].sort(compareCanonicalStrings);
}
