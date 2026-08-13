import type { ValidationIssue } from "./errors";
import { toEpoch } from "./temporal";
import type { GraphSnapshot, ShockScenario } from "./types";

function error(path: string, code: string, message: string): ValidationIssue {
  return { path, code, message, severity: "error" };
}

export function validateScenarioAgainstSnapshot(
  scenario: ShockScenario,
  snapshot: GraphSnapshot,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (scenario.graphSnapshotId !== snapshot.snapshotId) {
    issues.push(error("graphSnapshotId", "snapshot_mismatch", "Scenario references a different graph snapshot."));
  }
  if (toEpoch(scenario.decisionCutoff) !== toEpoch(snapshot.decisionCutoff)) {
    issues.push(error("decisionCutoff", "cutoff_mismatch", "Scenario and snapshot decision cutoffs must match exactly."));
  }
  const nodeIds = new Set(snapshot.nodes.map((node) => node.id));
  const edgeIds = new Set(snapshot.edges.map((edge) => edge.id));
  const sources = new Map(snapshot.sources.map((source) => [source.id, source]));
  for (const [index, shock] of scenario.shocks.entries()) {
    for (const id of shock.target.ids ?? []) {
      if (!nodeIds.has(id)) issues.push(error(`shocks[${index}].target.ids`, "unknown_node", `Unknown node ${id}.`));
    }
    for (const id of shock.target.edgeIds ?? []) {
      if (!edgeIds.has(id)) issues.push(error(`shocks[${index}].target.edgeIds`, "unknown_edge", `Unknown edge ${id}.`));
    }
    if (scenario.classification !== "synthetic_stress" && shock.sourceIds.length === 0) {
      issues.push(error(`shocks[${index}].sourceIds`, "missing_sources", "Historical and quasi-historical shocks require evidence sources."));
    }
    for (const sourceId of shock.sourceIds) {
      const source = sources.get(sourceId);
      if (!source) {
        issues.push(error(`shocks[${index}].sourceIds`, "unknown_source", `Unknown source ${sourceId}.`));
      } else if (source.role === "outcome") {
        issues.push(error(`shocks[${index}].sourceIds`, "outcome_leakage", "Outcome-only sources cannot define replay shocks."));
      } else if (toEpoch(source.availableAt) > toEpoch(scenario.decisionCutoff)) {
        issues.push(error(`shocks[${index}].sourceIds`, "future_source", `Source ${sourceId} was unavailable at the decision cutoff.`));
      }
    }
  }
  for (const [index, intervention] of scenario.interventions.entries()) {
    for (const id of intervention.targetNodeIds) {
      if (!nodeIds.has(id)) issues.push(error(`interventions[${index}].targetNodeIds`, "unknown_node", `Unknown node ${id}.`));
    }
    for (const id of intervention.targetEdgeIds) {
      if (!edgeIds.has(id)) issues.push(error(`interventions[${index}].targetEdgeIds`, "unknown_edge", `Unknown edge ${id}.`));
    }
  }
  return issues;
}
