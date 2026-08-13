import { performance } from "node:perf_hooks";
import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  runCascadeBounds,
  SCHEMA_VERSION,
  sealSnapshot,
  type GraphSnapshotDraft,
  type ShockScenario,
} from "../packages/core/src/index";

const profile = {
  nodes: 20_000,
  edges: 19_999,
  horizonsDays: [7, 30],
};

const budgets = {
  clientTotalBytes: 1_500_000,
  largestClientAssetBytes: 300_000,
  researchSmokeMilliseconds: 15_000,
  researchSmokeRssDeltaBytes: 768 * 1024 * 1024,
};

async function listFiles(directory: string): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...(await listFiles(path)));
    else if (entry.isFile()) output.push(path);
  }
  return output;
}

function draftForScale(): GraphSnapshotDraft {
  const observedAt = "2026-01-01T00:00:00Z";
  const sourceId = "source:research-smoke-assumption";
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshotId: "snapshot:research-smoke-20000",
    title: "Synthetic research-scale smoke profile",
    decisionCutoff: observedAt,
    generatedAt: observedAt,
    sources: [
      {
        id: sourceId,
        title: "Synthetic performance assumptions",
        publisher: "CascadeLens test suite",
        uri: "https://github.com/limingrui679-design/CascadeLens/blob/main/docs/PERFORMANCE.md",
        retrievedAt: observedAt,
        availableAt: observedAt,
        sha256: "0".repeat(64),
        contentType: "application/json",
        artifactKind: "citation_record",
        digestScope: "canonical_record",
        role: "context",
        license: {
          mode: "redistributable",
          name: "Apache-2.0",
          termsUri: "https://www.apache.org/licenses/LICENSE-2.0",
          spdx: "Apache-2.0",
        },
      },
    ],
    nodes: Array.from({ length: profile.nodes }, (_, index) => ({
      id: `node:scale-${index}`,
      kind: index === 0 ? ("route" as const) : ("industry" as const),
      label: `Scale node ${index}`,
      validFrom: observedAt,
      observedAt,
      properties: { criticality: 1 },
      evidence: {
        grade: "MODEL_INFERRED" as const,
        confidence: 0.5,
        sourceIds: [sourceId],
        reviewStatus: "not_required" as const,
      },
    })),
    edges: Array.from({ length: profile.edges }, (_, index) => ({
      id: `edge:scale-${index}`,
      from: `node:scale-${index}`,
      to: `node:scale-${index + 1}`,
      relation: "depends_on" as const,
      weight: { value: 0.2, lower: 0.1, upper: 0.3, unit: "share" },
      properties: {},
      validFrom: observedAt,
      observedAt,
      evidence: {
        grade: "MODEL_INFERRED" as const,
        confidence: 0.5,
        sourceIds: [sourceId],
        reviewStatus: "not_required" as const,
      },
    })),
  };
}

function scenarioForScale(): ShockScenario {
  return {
    schemaVersion: SCHEMA_VERSION,
    scenarioId: "scenario:research-smoke-20000",
    title: "Synthetic research-scale smoke scenario",
    summary: "A bounded runtime and memory profile; not an empirical analysis.",
    classification: "synthetic_stress",
    decisionCutoff: "2026-01-01T00:00:00Z",
    graphSnapshotId: "snapshot:research-smoke-20000",
    shocks: [
      {
        id: "shock:scale-root",
        label: "Root-node capacity stress",
        target: { ids: ["node:scale-0"] },
        operation: "multiply_capacity",
        magnitude: 0.5,
        unit: "share",
        startsAt: "2026-01-02T00:00:00Z",
        endsAt: "2026-01-09T00:00:00Z",
        rationale: "Synthetic bounded performance input.",
        sourceIds: ["source:research-smoke-assumption"],
      },
    ],
    propagation: {
      engine: "dependency_cascade",
      transmission: 0.8,
      maxIterations: 30,
      tolerance: 1e-9,
      horizonsDays: profile.horizonsDays,
      bounds: ["lower", "central", "upper"],
    },
    interventions: [],
    objectives: [
      { id: "objective:residual-impact", metric: "residual_impact", sense: "minimize" },
    ],
    constraints: {},
    limitations: [
      "Synthetic complexity smoke test only; it carries no real-world evidence or model-accuracy claim.",
    ],
  };
}

const clientDirectory = join(process.cwd(), "dist", "client");
const clientFiles = await listFiles(clientDirectory);
const clientAssets = await Promise.all(
  clientFiles.map(async (path) => ({
    path: relative(process.cwd(), path),
    bytes: (await stat(path)).size,
  })),
);
const clientTotalBytes = clientAssets.reduce((sum, asset) => sum + asset.bytes, 0);
const largestClientAsset = [...clientAssets].sort((left, right) => right.bytes - left.bytes)[0];

const rssBefore = process.memoryUsage().rss;
const startedAt = performance.now();
const snapshot = await sealSnapshot(draftForScale());
const sealedAt = performance.now();
const results = await runCascadeBounds(snapshot, scenarioForScale());
const completedAt = performance.now();
const researchSmokeMilliseconds = completedAt - startedAt;
const researchSmokeRssDeltaBytes = Math.max(0, process.memoryUsage().rss - rssBefore);

const report = {
  generatedAt: new Date().toISOString(),
  budgets,
  measurements: {
    clientTotalBytes,
    largestClientAsset,
    researchSmokeMilliseconds: Math.round(researchSmokeMilliseconds),
    graphConstructionAndSealMilliseconds: Math.round(sealedAt - startedAt),
    cascadeMilliseconds: Math.round(completedAt - sealedAt),
    researchSmokeRssDeltaBytes,
    profile,
    upperThirtyDayImpact: results.upper.totalWeightedImpact,
  },
};

const failures: string[] = [];
if (clientTotalBytes > budgets.clientTotalBytes) failures.push("client_total_budget_exceeded");
if (largestClientAsset.bytes > budgets.largestClientAssetBytes) {
  failures.push("largest_client_asset_budget_exceeded");
}
if (researchSmokeMilliseconds > budgets.researchSmokeMilliseconds) {
  failures.push("research_smoke_time_budget_exceeded");
}
if (researchSmokeRssDeltaBytes > budgets.researchSmokeRssDeltaBytes) {
  failures.push("research_smoke_memory_budget_exceeded");
}
if (results.horizons.length !== profile.horizonsDays.length) {
  failures.push("research_smoke_horizon_output_missing");
}

console.log(JSON.stringify({ ...report, failures }, null, 2));
if (failures.length > 0) process.exitCode = 1;
