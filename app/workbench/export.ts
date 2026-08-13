import type {
  CascadeBounds,
  GraphSnapshot,
  InterventionAnalysis,
  ShockScenario,
} from "../../packages/core/src/index";

export interface WorkbenchExportInput {
  scenario: ShockScenario;
  snapshot: GraphSnapshot;
  bounds: CascadeBounds;
  interventions: InterventionAnalysis;
}

export interface WorkbenchExportArtifact {
  filename: string;
  mediaType: "application/json";
  text: string;
}

function safeFilename(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return normalized || "cascadelens-scenario";
}

export function buildWorkbenchExport(input: WorkbenchExportInput): WorkbenchExportArtifact {
  const payload = {
    status: "scenario_output_not_empirical_validation",
    scenario: input.scenario,
    snapshotDigest: input.snapshot.contentDigest,
    bounds: input.bounds,
    interventions: input.interventions,
    disclaimer:
      "Generated in-browser from an assumed topology; not a forecast, causal estimate, or realized loss.",
  };
  return {
    filename: `${safeFilename(input.scenario.scenarioId)}-analysis.json`,
    mediaType: "application/json",
    text: `${JSON.stringify(payload, null, 2)}\n`,
  };
}
