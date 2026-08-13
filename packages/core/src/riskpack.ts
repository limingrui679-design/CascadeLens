import {
  compareCanonicalStrings,
  sha256Text,
  stableStringify,
} from "./canonical";
import { runCascadeBounds } from "./cascade";
import { analyzeInterventions } from "./interventions";
import { scoreReplay } from "./benchmark";
import { valueObservations } from "./observability";
import { validateScenario } from "./shockscript";
import { validateScenarioAgainstSnapshot } from "./contracts";
import { isIsoDateTime } from "./temporal";
import {
  riskPackLimitations,
  validateRiskPackMetadata,
} from "./riskpack-metadata";
import { verifySnapshot } from "./worldgraph";
import {
  ENGINE_VERSION,
  SCHEMA_VERSION,
  type AssumptionRegister,
  type BenchmarkResult,
  type CandidateObservation,
  type CascadeBounds,
  type GraphSnapshot,
  type InterventionAnalysis,
  type ModelCard,
  type ObservationValue,
  type OutcomeObservation,
  type RiskPack,
  type RiskPackManifest,
  type ShockScenario,
} from "./types";

const safePathPattern = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;
const requiredPayloadPaths = [
  "REBUILD.txt",
  "assumptions.json",
  "graph/snapshot.json",
  "inputs/benchmark-outcomes.json",
  "inputs/observation-candidates.json",
  "inputs/observability-config.json",
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
    .sort(([left], [right]) => compareCanonicalStrings(left, right))
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
  return [...statuses].sort(compareCanonicalStrings);
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
  benchmarkOutcomes?: OutcomeObservation[];
  observationCandidates?: CandidateObservation[];
  riskValuePerUnit?: number;
  rebuildCommand: string;
}

export async function createRiskPack(input: RiskPackInput): Promise<RiskPack> {
  const benchmarkOutcomes = input.benchmarkOutcomes ?? [];
  const observationCandidates = input.observationCandidates ?? [];
  const riskValuePerUnit = input.riskValuePerUnit ?? 100;
  const [recomputedBounds, recomputedInterventions] = await Promise.all([
    runCascadeBounds(input.snapshot, input.scenario),
    analyzeInterventions(input.snapshot, input.scenario),
  ]);
  const recomputedBenchmark = scoreReplay(
    input.snapshot,
    input.scenario,
    recomputedBounds,
    benchmarkOutcomes,
  );
  const recomputedObservations = await valueObservations(
    input.snapshot,
    input.scenario,
    observationCandidates,
    riskValuePerUnit,
  );
  for (const [label, supplied, recomputed] of [
    ["cascade bounds", input.bounds, recomputedBounds],
    ["intervention analysis", input.interventionAnalysis, recomputedInterventions],
    ["benchmark", input.benchmark, recomputedBenchmark],
    ["observability", input.observationValues, recomputedObservations],
  ] as const) {
    if (stableStringify(supplied) !== stableStringify(recomputed)) {
      throw new TypeError(`RiskPack ${label} does not match deterministic recomputation.`);
    }
  }
  const assumptionsText = stableStringify(input.assumptions, 2) + "\n";
  const limitations = riskPackLimitations(input.scenario, input.benchmark);
  const metadataIssues = await validateRiskPackMetadata({
    assumptions: input.assumptions,
    assumptionsText,
    modelCard: input.modelCard,
    limitations,
    snapshot: input.snapshot,
    scenario: input.scenario,
    benchmark: input.benchmark,
    observationCandidates,
  });
  if (metadataIssues.length > 0) {
    throw new TypeError(
      `RiskPack metadata contract failed: ${metadataIssues.join(", ")}`,
    );
  }
  const payload: Record<string, string> = {
    "scenario.json": stableStringify(input.scenario, 2) + "\n",
    "graph/snapshot.json": stableStringify(input.snapshot, 2) + "\n",
    "results/cascade-bounds.json": stableStringify(input.bounds, 2) + "\n",
    "results/interventions.json": stableStringify(input.interventionAnalysis, 2) + "\n",
    "results/observability.json": stableStringify(input.observationValues, 2) + "\n",
    "results/benchmark.json": stableStringify(input.benchmark, 2) + "\n",
    "inputs/benchmark-outcomes.json": stableStringify(benchmarkOutcomes, 2) + "\n",
    "inputs/observation-candidates.json": stableStringify(observationCandidates, 2) + "\n",
    "inputs/observability-config.json": stableStringify({ riskValuePerUnit }, 2) + "\n",
    "sources/manifest.json": stableStringify(input.snapshot.sources, 2) + "\n",
    "assumptions.json": assumptionsText,
    "model-card.json": stableStringify(input.modelCard, 2) + "\n",
    "REBUILD.txt": `${input.rebuildCommand}\n`,
    "limitations.json": stableStringify(limitations, 2) + "\n",
  };
  const manifest: RiskPackManifest = {
    schemaVersion: SCHEMA_VERSION,
    engineVersion: ENGINE_VERSION,
    packId: input.packId,
    scenarioId: input.scenario.scenarioId,
    classification: input.scenario.classification,
    generatedAt: input.generatedAt,
    snapshotDigest: input.snapshot.contentDigest,
    verificationMode: "recomputed",
    files: Object.keys(payload).sort(compareCanonicalStrings),
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
  const expectedPayload = [...declaredFiles].sort(compareCanonicalStrings);
  const actualPayload = Object.keys(pack.files)
    .filter((path) => path !== "manifest.json" && path !== "checksums.sha256")
    .sort(compareCanonicalStrings);
  if (JSON.stringify(expectedPayload) !== JSON.stringify(actualPayload)) {
    issues.push("manifest_file_set_mismatch");
  }
  if (
    JSON.stringify(expectedPayload) !==
    JSON.stringify([...requiredPayloadPaths].sort(compareCanonicalStrings))
  ) {
    issues.push("required_file_set_mismatch");
  }
  const hashable = Object.keys(pack.files).filter((path) => path !== "checksums.sha256");
  const checksumPaths = Object.keys(pack.checksums).sort(compareCanonicalStrings);
  if (
    JSON.stringify(hashable.sort(compareCanonicalStrings)) !==
    JSON.stringify(checksumPaths)
  ) {
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
    ) as ObservationValue[];
    const benchmarkOutcomes = JSON.parse(
      pack.files["inputs/benchmark-outcomes.json"],
    ) as OutcomeObservation[];
    const observationCandidates = JSON.parse(
      pack.files["inputs/observation-candidates.json"],
    ) as CandidateObservation[];
    const observabilityConfig = JSON.parse(
      pack.files["inputs/observability-config.json"],
    ) as { riskValuePerUnit?: number };
    if (manifest.schemaVersion !== SCHEMA_VERSION) issues.push("manifest_schema_version_mismatch");
    if (manifest.engineVersion !== ENGINE_VERSION) issues.push("manifest_engine_version_mismatch");
    if (manifest.verificationMode !== "recomputed") {
      issues.push("manifest_verification_mode_mismatch");
    }
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
    const metadataIssues = await validateRiskPackMetadata({
      assumptions,
      assumptionsText: pack.files["assumptions.json"],
      modelCard,
      limitations,
      snapshot,
      scenario,
      benchmark,
      observationCandidates,
    });
    issues.push(...metadataIssues);
    if (stableStringify(sources) !== stableStringify(snapshot.sources)) {
      issues.push("source_manifest_mismatch");
    }
    if (!Array.isArray(observations)) issues.push("invalid_observability_output");
    if (!Array.isArray(benchmarkOutcomes)) issues.push("invalid_benchmark_outcomes");
    if (!Array.isArray(observationCandidates)) issues.push("invalid_observation_candidates");
    if (
      !Number.isFinite(observabilityConfig.riskValuePerUnit) ||
      observabilityConfig.riskValuePerUnit! <= 0
    ) {
      issues.push("invalid_observability_config");
    }
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

    if (
      Array.isArray(benchmarkOutcomes) &&
      Array.isArray(observationCandidates) &&
      Number.isFinite(observabilityConfig.riskValuePerUnit) &&
      observabilityConfig.riskValuePerUnit! > 0
    ) {
      const [recomputedBounds, recomputedInterventions] = await Promise.all([
        runCascadeBounds(snapshot, scenario),
        analyzeInterventions(snapshot, scenario),
      ]);
      const recomputedBenchmark = scoreReplay(
        snapshot,
        scenario,
        recomputedBounds,
        benchmarkOutcomes,
      );
      const recomputedObservations = await valueObservations(
        snapshot,
        scenario,
        observationCandidates,
        observabilityConfig.riskValuePerUnit!,
      );
      for (const [path, supplied, recomputed] of [
        ["results/cascade-bounds.json", bounds, recomputedBounds],
        ["results/interventions.json", interventions, recomputedInterventions],
        ["results/benchmark.json", benchmark, recomputedBenchmark],
        ["results/observability.json", observations, recomputedObservations],
      ] as const) {
        if (stableStringify(supplied) !== stableStringify(recomputed)) {
          issues.push(`derived_output_mismatch:${path}`);
        }
      }
    }
  } catch (error) {
    issues.push(`invalid_json:${error instanceof Error ? error.message : String(error)}`);
  }
  return [...new Set(issues)].sort(compareCanonicalStrings);
}

export interface RiskPackVerificationReport {
  status: "recomputed" | "invalid";
  packDigest: string;
  expectedDigestMatched: boolean | null;
  issues: string[];
}

export async function verifyRiskPackDetailed(
  pack: RiskPack,
  expectedDigest?: string,
): Promise<RiskPackVerificationReport> {
  const issues = await verifyRiskPack(pack);
  const packDigest = await sha256Text(pack.files?.["checksums.sha256"] ?? "");
  let expectedDigestMatched: boolean | null = null;
  if (expectedDigest !== undefined) {
    expectedDigestMatched = packDigest === expectedDigest;
    if (!/^[a-f0-9]{64}$/.test(expectedDigest)) {
      issues.push("invalid_expected_pack_digest");
    } else if (!expectedDigestMatched) {
      issues.push("external_pack_digest_mismatch");
    }
  }
  const uniqueIssues = [...new Set(issues)].sort(compareCanonicalStrings);
  return {
    status: uniqueIssues.length === 0 ? "recomputed" : "invalid",
    packDigest,
    expectedDigestMatched,
    issues: uniqueIssues,
  };
}
