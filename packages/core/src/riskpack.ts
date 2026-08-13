import { sha256Text, stableStringify } from "./canonical";
import { validateScenario } from "./shockscript";
import { validateScenarioAgainstSnapshot } from "./contracts";
import { isIsoDateTime } from "./temporal";
import { verifySnapshot } from "./worldgraph";
import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  type AssumptionRegister,
  type BenchmarkResult,
  type CascadeBounds,
  type GraphSnapshot,
  type InterventionAnalysis,
  type ModelCard,
  type ObservationValue,
  type RiskPack,
  type RiskPackManifest,
  type ShockScenario,
} from "./types";

const safePathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;
const requiredPayloadPaths = [
  "REBUILD.txt",
  "assumptions.json",
  "graph/snapshot.json",
  "limitations.json",
  "model-card.json",
  "results/benchmark.json",
  "results/cascade-bounds.json",
  "results/interventions.json",
  "results/observability.json",
  "scenario.json",
  "sources/manifest.json",
] as const;

function checksumText(checksums: Record<string, string>): string {
  return Object.entries(checksums)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, digest]) => `${digest}  ${path}`)
    .join("\n") + "\n";
}

function truthfulStatuses(
  snapshot: GraphSnapshot,
  benchmark: BenchmarkResult,
): RiskPackManifest["truthfulStatus"] {
  const statuses = new Set<RiskPackManifest["truthfulStatus"][number]>();
  const grades = [...snapshot.nodes, ...snapshot.edges].map((item) => item.evidence.grade);
  if (grades.includes("OFFICIAL_OBSERVED")) statuses.add("observed");
  if (grades.includes("ENTITY_REPORTED")) statuses.add("entity_reported");
  if (grades.includes("THIRD_PARTY_VERIFIED")) statuses.add("third_party_verified");
  if (grades.includes("TEXT_EXTRACTED")) statuses.add("text_extracted");
  if (grades.includes("MODEL_INFERRED")) statuses.add("model_inferred");
  statuses.add(
    benchmark.status === "historically_scored"
      ? "historically_scored"
      : "scenario_only",
  );
  return [...statuses].sort();
}

export interface RiskPackInput {
  packId: string;
  generatedAt: string;
  snapshot: GraphSnapshot;
  scenario: ShockScenario;
  bounds: CascadeBounds;
  interventionAnalysis: InterventionAnalysis;
  benchmark: BenchmarkResult;
  assumptions: AssumptionRegister;
  modelCard: ModelCard;
  observationValues: ObservationValue[];
  rebuildCommand: string;
}

export async function createRiskPack(input: RiskPackInput): Promise<RiskPack> {
  const payload: Record<string, string> = {
    "scenario.json": stableStringify(input.scenario, 2) + "\n",
    "graph/snapshot.json": stableStringify(input.snapshot, 2) + "\n",
    "results/cascade-bounds.json": stableStringify(input.bounds, 2) + "\n",
    "results/interventions.json": stableStringify(input.interventionAnalysis, 2) + "\n",
    "results/observability.json": stableStringify(input.observationValues, 2) + "\n",
    "results/benchmark.json": stableStringify(input.benchmark, 2) + "\n",
    "sources/manifest.json": stableStringify(input.snapshot.sources, 2) + "\n",
    "assumptions.json": stableStringify(input.assumptions, 2) + "\n",
    "model-card.json": stableStringify(input.modelCard, 2) + "\n",
    "REBUILD.txt": `${input.rebuildCommand}\n`,
    "limitations.json": stableStringify(
      {
        scenarioLimitations: input.scenario.limitations,
        benchmarkLimitations: input.benchmark.limitations,
        disclaimer:
          "Scenario outputs are not causal estimates, realized losses, investment advice, legal advice, clinical advice, or evidence of adoption.",
      },
      2,
    ) + "\n",
  };
  const manifest: RiskPackManifest = {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    packId: input.packId,
    scenarioId: input.scenario.scenarioId,
    classification: input.scenario.classification,
    generatedAt: input.generatedAt,
    snapshotDigest: input.snapshot.contentDigest,
    files: Object.keys(payload).sort(),
    truthfulStatus: truthfulStatuses(input.snapshot, input.benchmark),
  };
  const files: Record<string, string> = {
    "manifest.json": stableStringify(manifest, 2) + "\n",
    ...payload,
  };
  const checksums: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    checksums[path] = await sha256Text(content);
  }
  files["checksums.sha256"] = checksumText(checksums);
  return { manifest, files, checksums };
}

export async function verifyRiskPack(pack: RiskPack): Promise<string[]> {
  const issues: string[] = [];
  if (!pack || typeof pack !== "object" || !pack.manifest || !pack.files || !pack.checksums) {
    return ["invalid_pack_structure"];
  }
  for (const path of Object.keys(pack.files)) {
    if (!safePathPattern.test(path)) issues.push(`unsafe_path:${path}`);
  }
  const declaredFiles = Array.isArray(pack.manifest.files)
    ? pack.manifest.files.filter((path): path is string => typeof path === "string")
    : [];
  if (declaredFiles.length !== pack.manifest.files?.length) {
    issues.push("invalid_manifest_files");
  }
  if (new Set(declaredFiles).size !== declaredFiles.length) {
    issues.push("duplicate_manifest_files");
  }
  for (const path of declaredFiles) {
    if (!safePathPattern.test(path)) issues.push(`unsafe_manifest_path:${path}`);
  }
  const expectedPayload = [...declaredFiles].sort();
  const actualPayload = Object.keys(pack.files)
    .filter((path) => path !== "manifest.json" && path !== "checksums.sha256")
    .sort();
  if (JSON.stringify(expectedPayload) !== JSON.stringify(actualPayload)) {
    issues.push("manifest_file_set_mismatch");
  }
  if (
    JSON.stringify(expectedPayload) !==
    JSON.stringify([...requiredPayloadPaths].sort())
  ) {
    issues.push("required_file_set_mismatch");
  }
  const hashable = Object.keys(pack.files).filter((path) => path !== "checksums.sha256");
  const checksumPaths = Object.keys(pack.checksums).sort();
  if (JSON.stringify(hashable.sort()) !== JSON.stringify(checksumPaths)) {
    issues.push("checksum_file_set_mismatch");
  }
  for (const path of hashable) {
    const actual = await sha256Text(pack.files[path]);
    if (actual !== pack.checksums[path]) issues.push(`checksum_mismatch:${path}`);
  }
  if (pack.files["checksums.sha256"] !== checksumText(pack.checksums)) {
    issues.push("checksum_text_mismatch");
  }

  try {
    const manifest = JSON.parse(pack.files["manifest.json"]) as RiskPackManifest;
    if (stableStringify(manifest) !== stableStringify(pack.manifest)) {
      issues.push("manifest_object_mismatch");
    }
    const scenario = JSON.parse(pack.files["scenario.json"]) as ShockScenario;
    const snapshot = JSON.parse(pack.files["graph/snapshot.json"]) as GraphSnapshot;
    const bounds = JSON.parse(pack.files["results/cascade-bounds.json"]) as CascadeBounds;
    const interventions = JSON.parse(
      pack.files["results/interventions.json"],
    ) as InterventionAnalysis;
    const benchmark = JSON.parse(pack.files["results/benchmark.json"]) as BenchmarkResult;
    const assumptions = JSON.parse(
      pack.files["assumptions.json"],
    ) as AssumptionRegister;
    const modelCard = JSON.parse(pack.files["model-card.json"]) as ModelCard;
    const sources = JSON.parse(pack.files["sources/manifest.json"]) as unknown;
    const limitations = JSON.parse(pack.files["limitations.json"]) as unknown;
    const observations = JSON.parse(
      pack.files["results/observability.json"],
    ) as unknown;
    if (manifest.schemaVersion !== SCHEMA_VERSION) issues.push("manifest_schema_version_mismatch");
    if (manifest.engineVersion !== ENGINE_VERSION) issues.push("manifest_engine_version_mismatch");
    if (!isIsoDateTime(manifest.generatedAt)) issues.push("invalid_manifest_generated_at");
    if (typeof manifest.packId !== "string" || manifest.packId.trim() === "") {
      issues.push("invalid_pack_id");
    }
    if (validateScenario(scenario).some((issue) => issue.severity === "error")) {
      issues.push("invalid_scenario");
    }
    if ((await verifySnapshot(snapshot)).some((issue) => issue.severity === "error")) {
      issues.push("invalid_snapshot");
    }
    if (validateScenarioAgainstSnapshot(scenario, snapshot).some((issue) => issue.severity === "error")) {
      issues.push("scenario_snapshot_contract_failed");
    }
    if (scenario.scenarioId !== manifest.scenarioId) issues.push("scenario_id_mismatch");
    if (scenario.classification !== manifest.classification) issues.push("classification_mismatch");
    if (snapshot.contentDigest !== manifest.snapshotDigest) issues.push("snapshot_digest_mismatch");
    for (const bound of [bounds.lower, bounds.central, bounds.upper]) {
      if (bound.scenarioId !== scenario.scenarioId) issues.push("bounds_scenario_id_mismatch");
      if (bound.snapshotDigest !== snapshot.contentDigest) issues.push("bounds_snapshot_digest_mismatch");
    }
    if (
      bounds.lower.bound !== "lower" ||
      bounds.central.bound !== "central" ||
      bounds.upper.bound !== "upper"
    ) {
      issues.push("invalid_bound_labels");
    }
    const requestedHorizons = [...scenario.propagation.horizonsDays]
      .sort((left, right) => left - right);
    const deliveredHorizons = Array.isArray(bounds.horizons)
      ? bounds.horizons.map((item) => item.horizonDays)
      : [];
    if (stableStringify(deliveredHorizons) !== stableStringify(requestedHorizons)) {
      issues.push("cascade_horizon_set_mismatch");
    }
    for (const horizon of Array.isArray(bounds.horizons) ? bounds.horizons : []) {
      for (const [expectedBound, result] of [
        ["lower", horizon.lower],
        ["central", horizon.central],
        ["upper", horizon.upper],
      ] as const) {
        if (
          result.bound !== expectedBound ||
          result.horizonDays !== horizon.horizonDays ||
          result.scenarioId !== scenario.scenarioId ||
          result.snapshotDigest !== snapshot.contentDigest ||
          result.metric !== "time_weighted_mean_node_impact"
        ) {
          issues.push("invalid_horizon_result_identity");
        }
        const numericValues = [
          result.totalWeightedImpact,
          result.totalWeightedPeakEnvelope,
          result.endWeightedImpact,
          ...result.impacts.flatMap((impact) => [
            impact.impact,
            impact.peakImpact,
            impact.endImpact,
            impact.directImpact,
            impact.peakDirectImpact,
          ]),
        ];
        if (numericValues.some((value) => !Number.isFinite(value) || value < 0)) {
          issues.push("invalid_cascade_numeric_output");
        }
        if (
          result.impacts.some(
            (impact) =>
              impact.impact > impact.peakImpact + 1e-12 ||
              impact.endImpact > impact.peakImpact + 1e-12 ||
              impact.directImpact > impact.peakDirectImpact + 1e-12,
          )
        ) {
          issues.push("invalid_cascade_peak_envelope");
        }
      }
      if (
        horizon.lower.totalWeightedImpact > horizon.central.totalWeightedImpact + 1e-12 ||
        horizon.central.totalWeightedImpact > horizon.upper.totalWeightedImpact + 1e-12
      ) {
        issues.push("nonmonotone_cascade_bounds");
      }
    }
    const longest = Array.isArray(bounds.horizons) ? bounds.horizons.at(-1) : undefined;
    if (
      !longest ||
      stableStringify(bounds.lower) !== stableStringify(longest.lower) ||
      stableStringify(bounds.central) !== stableStringify(longest.central) ||
      stableStringify(bounds.upper) !== stableStringify(longest.upper)
    ) {
      issues.push("top_level_bounds_not_longest_horizon");
    }
    if (interventions.scenarioId !== scenario.scenarioId) {
      issues.push("interventions_scenario_id_mismatch");
    }
    if (benchmark.scenarioId !== scenario.scenarioId) {
      issues.push("benchmark_scenario_id_mismatch");
    }
    if (benchmark.classification !== scenario.classification) {
      issues.push("benchmark_classification_mismatch");
    }
    if (assumptions.scenarioId !== scenario.scenarioId) {
      issues.push("assumptions_scenario_id_mismatch");
    }
    if (assumptions.status !== "scenario_parameters_not_observations") {
      issues.push("invalid_assumption_status");
    }
    if (modelCard.version !== ENGINE_VERSION) issues.push("model_card_version_mismatch");
    if (stableStringify(sources) !== stableStringify(snapshot.sources)) {
      issues.push("source_manifest_mismatch");
    }
    if (!Array.isArray(observations)) issues.push("invalid_observability_output");
    if (!limitations || typeof limitations !== "object") issues.push("invalid_limitations");
    if (typeof pack.files["REBUILD.txt"] !== "string" || pack.files["REBUILD.txt"].trim() === "") {
      issues.push("missing_rebuild_command");
    }
    if (/\/(?:Users|home)\//.test(pack.files["REBUILD.txt"])) {
      issues.push("nonportable_rebuild_command");
    }
    const actualStatuses = truthfulStatuses(snapshot, benchmark);
    if (
      JSON.stringify([...(manifest.truthfulStatus ?? [])].sort()) !==
      JSON.stringify(actualStatuses)
    ) {
      issues.push("truthful_status_mismatch");
    }
  } catch (error) {
    issues.push(`invalid_json:${error instanceof Error ? error.message : String(error)}`);
  }
  return [...new Set(issues)].sort();
}
