import YAML from "yaml";
import { assertNoErrors, type ValidationIssue } from "./errors";
import { isIsoDateTime, toEpoch } from "./temporal";
import {
  evidenceGrades,
  interventionTypes,
  nodeKinds,
  relationKinds,
  SCHEMA_VERSION,
  shockOperations,
  type ShockScenario,
} from "./types";

function add(
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
): void {
  issues.push({ path, code, message, severity: "error" });
}

function unknownKeys(
  issues: ValidationIssue[],
  value: unknown,
  path: string,
  allowed: readonly string[],
): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedSet.has(key)) {
      add(issues, path === "$" ? key : `${path}.${key}`, "unknown_field", `Unknown field ${key}.`);
    }
  }
}

function assertSafeStructure(value: unknown): void {
  const queue: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let visited = 0;
  while (queue.length > 0) {
    const current = queue.pop()!;
    visited += 1;
    if (visited > 100_000) throw new RangeError("ShockScript has too many nested values.");
    if (current.depth > 64) throw new RangeError("ShockScript exceeds the nesting-depth limit.");
    if (!current.value || typeof current.value !== "object") continue;
    for (const [key, child] of Object.entries(current.value as Record<string, unknown>)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) {
        throw new TypeError(`Unsafe ShockScript key ${key}.`);
      }
      queue.push({ value: child, depth: current.depth + 1 });
    }
  }
}

export function validateScenario(value: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    add(issues, "$", "invalid_document", "ShockScript must be an object.");
    return issues;
  }
  const scenario = value as Partial<ShockScenario>;
  unknownKeys(issues, scenario, "$", [
    "schemaVersion", "scenarioId", "title", "summary", "classification",
    "decisionCutoff", "graphSnapshotId", "shocks", "propagation",
    "interventions", "objectives", "constraints", "limitations",
  ]);
  if (scenario.schemaVersion !== SCHEMA_VERSION) {
    add(issues, "schemaVersion", "unsupported_schema", `Expected ${SCHEMA_VERSION}.`);
  }
  for (const field of ["scenarioId", "title", "summary", "graphSnapshotId"] as const) {
    if (typeof scenario[field] !== "string" || scenario[field]?.trim() === "") {
      add(issues, field, "required", `${field} is required.`);
    }
  }
  if (!isIsoDateTime(scenario.decisionCutoff ?? "")) {
    add(issues, "decisionCutoff", "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
  }
  if (!scenario.classification || !["historical_replay", "quasi_historical", "synthetic_stress"].includes(scenario.classification)) {
    add(issues, "classification", "invalid_classification", "Unknown scenario classification.");
  }
  if (!Array.isArray(scenario.shocks) || scenario.shocks.length === 0 || scenario.shocks.length > 100) {
    add(issues, "shocks", "required", "At least one shock is required.");
  } else {
    const ids = new Set<string>();
    scenario.shocks.forEach((shock, index) => {
      const path = `shocks[${index}]`;
      unknownKeys(issues, shock, path, [
        "id", "label", "target", "operation", "magnitude", "unit",
        "startsAt", "endsAt", "rationale", "sourceIds",
      ]);
      unknownKeys(issues, shock.target, `${path}.target`, [
        "ids", "edgeIds", "kind", "relation", "jurisdiction", "propertyEquals",
      ]);
      unknownKeys(issues, shock.target?.propertyEquals, `${path}.target.propertyEquals`, ["key", "value"]);
      if (!shock.id || ids.has(shock.id)) add(issues, `${path}.id`, "invalid_id", "Shock id is required and must be unique.");
      ids.add(shock.id);
      if (!shockOperations.includes(shock.operation)) add(issues, `${path}.operation`, "invalid_operation", "Unknown shock operation.");
      if (!Number.isFinite(shock.magnitude) || shock.magnitude < 0) add(issues, `${path}.magnitude`, "invalid_magnitude", "Magnitude must be a non-negative finite number.");
      if (!isIsoDateTime(shock.startsAt)) add(issues, `${path}.startsAt`, "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
      if (shock.endsAt && !isIsoDateTime(shock.endsAt)) add(issues, `${path}.endsAt`, "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
      if (shock.endsAt && isIsoDateTime(shock.startsAt) && isIsoDateTime(shock.endsAt) && toEpoch(shock.endsAt) <= toEpoch(shock.startsAt)) {
        add(issues, `${path}.endsAt`, "invalid_interval", "Shock end must follow its start.");
      }
      if (!shock.target || (!shock.target.ids?.length && !shock.target.edgeIds?.length && !shock.target.kind && !shock.target.relation && !shock.target.jurisdiction && !shock.target.propertyEquals)) {
        add(issues, `${path}.target`, "empty_target", "A shock target needs ids or a typed selector.");
      }
      if (shock.target?.kind && !nodeKinds.includes(shock.target.kind)) {
        add(issues, `${path}.target.kind`, "invalid_node_kind", "Unknown node kind.");
      }
      if (shock.target?.relation && !relationKinds.includes(shock.target.relation)) {
        add(issues, `${path}.target.relation`, "invalid_relation", "Unknown relation kind.");
      }
      if (shock.target?.ids && (!Array.isArray(shock.target.ids) || shock.target.ids.some((id) => typeof id !== "string" || id.trim() === ""))) {
        add(issues, `${path}.target.ids`, "invalid_ids", "Node target ids must be non-empty strings.");
      }
      if (shock.target?.edgeIds && (!Array.isArray(shock.target.edgeIds) || shock.target.edgeIds.some((id) => typeof id !== "string" || id.trim() === ""))) {
        add(issues, `${path}.target.edgeIds`, "invalid_ids", "Edge target ids must be non-empty strings.");
      }
      if (!Array.isArray(shock.sourceIds)) add(issues, `${path}.sourceIds`, "invalid_sources", "sourceIds must be an array.");
    });
  }
  const propagation = scenario.propagation;
  unknownKeys(issues, propagation, "propagation", [
    "engine", "transmission", "maxIterations", "tolerance", "horizonsDays", "bounds",
  ]);
  if (!propagation || typeof propagation.engine !== "string" || !/^[a-z][a-z0-9_-]{1,63}$/.test(propagation.engine)) {
    add(issues, "propagation.engine", "invalid_engine", "Use a registered lowercase engine identifier.");
  } else {
    if (!Number.isFinite(propagation.transmission) || propagation.transmission < 0 || propagation.transmission > 1) {
      add(issues, "propagation.transmission", "invalid_transmission", "Transmission must be between 0 and 1.");
    }
    if (!Number.isInteger(propagation.maxIterations) || propagation.maxIterations < 1 || propagation.maxIterations > 10_000) {
      add(issues, "propagation.maxIterations", "invalid_iterations", "maxIterations must be an integer from 1 to 10000.");
    }
    if (!Number.isFinite(propagation.tolerance) || propagation.tolerance <= 0 || propagation.tolerance >= 1) {
      add(issues, "propagation.tolerance", "invalid_tolerance", "Tolerance must be greater than 0 and less than 1.");
    }
    if (!Array.isArray(propagation.horizonsDays) || propagation.horizonsDays.length === 0 || propagation.horizonsDays.some((day) => !Number.isInteger(day) || day <= 0)) {
      add(issues, "propagation.horizonsDays", "invalid_horizons", "Use one or more positive integer horizons.");
    } else if (
      Number.isInteger(propagation.maxIterations) &&
      propagation.maxIterations < Math.max(...propagation.horizonsDays)
    ) {
      add(
        issues,
        "propagation.maxIterations",
        "insufficient_iterations",
        "maxIterations must cover the longest daily propagation horizon.",
      );
    }
    if (!Array.isArray(propagation.bounds) || !["lower", "central", "upper"].every((bound) => propagation.bounds.includes(bound as never))) {
      add(issues, "propagation.bounds", "missing_bounds", "lower, central, and upper bounds are required.");
    }
  }
  if (!Array.isArray(scenario.interventions) || scenario.interventions.length > 16) {
    add(issues, "interventions", "invalid_interventions", "interventions must be an array.");
  } else {
    const ids = new Set<string>();
    scenario.interventions.forEach((intervention, index) => {
      const path = `interventions[${index}]`;
      unknownKeys(issues, intervention, path, [
        "id", "label", "type", "targetNodeIds", "targetEdgeIds", "cost",
        "costUnit", "leadTimeDays", "effect", "mutuallyExclusiveGroup",
        "evidenceGrade", "rationale",
      ]);
      if (!intervention.id || ids.has(intervention.id)) add(issues, `${path}.id`, "invalid_id", "Intervention id is required and must be unique.");
      ids.add(intervention.id);
      if (!interventionTypes.includes(intervention.type)) add(issues, `${path}.type`, "invalid_type", "Unknown intervention type.");
      if (!Number.isFinite(intervention.cost) || intervention.cost < 0) add(issues, `${path}.cost`, "invalid_cost", "Cost must be non-negative.");
      if (!Number.isInteger(intervention.leadTimeDays) || intervention.leadTimeDays < 0) add(issues, `${path}.leadTimeDays`, "invalid_lead_time", "Lead time must be a non-negative integer.");
      if (!Number.isFinite(intervention.effect) || intervention.effect < 0 || intervention.effect > 1) add(issues, `${path}.effect`, "invalid_effect", "Effect must be between 0 and 1.");
      if (!evidenceGrades.includes(intervention.evidenceGrade)) add(issues, `${path}.evidenceGrade`, "invalid_evidence_grade", "Unknown evidence grade.");
    });
  }
  if (!Array.isArray(scenario.objectives) || scenario.objectives.length === 0) {
    add(issues, "objectives", "required", "At least one objective is required.");
  }
  if (Array.isArray(scenario.objectives)) {
    scenario.objectives.forEach((objective, index) => {
      const path = `objectives[${index}]`;
      unknownKeys(issues, objective, path, ["id", "metric", "sense", "weight", "threshold"]);
      if (!objective.id) add(issues, `${path}.id`, "required", "Objective id is required.");
      if (!["residual_impact", "cost", "concentration", "unmet_demand"].includes(objective.metric)) {
        add(issues, `${path}.metric`, "invalid_metric", "Unknown objective metric.");
      }
      if (!["minimize", "maximize"].includes(objective.sense)) {
        add(issues, `${path}.sense`, "invalid_sense", "Unknown objective sense.");
      }
      if (objective.weight !== undefined && !Number.isFinite(objective.weight)) {
        add(issues, `${path}.weight`, "invalid_weight", "Objective weight must be finite.");
      }
      if (objective.threshold !== undefined && !Number.isFinite(objective.threshold)) {
        add(issues, `${path}.threshold`, "invalid_threshold", "Objective threshold must be finite.");
      }
    });
  }
  if (!Array.isArray(scenario.limitations) || scenario.limitations.length === 0) {
    add(issues, "limitations", "required", "At least one explicit limitation is required.");
  }
  if (scenario.constraints?.budget !== undefined && (!Number.isFinite(scenario.constraints.budget) || scenario.constraints.budget < 0)) {
    add(issues, "constraints.budget", "invalid_budget", "Budget must be non-negative.");
  }
  unknownKeys(issues, scenario.constraints, "constraints", [
    "budget", "budgetUnit", "maxInterventions", "maxLeadTimeDays",
  ]);
  if (
    scenario.constraints?.maxInterventions !== undefined &&
    (!Number.isInteger(scenario.constraints.maxInterventions) || scenario.constraints.maxInterventions < 0 || scenario.constraints.maxInterventions > 16)
  ) {
    add(issues, "constraints.maxInterventions", "invalid_limit", "maxInterventions must be an integer from 0 to 16.");
  }
  if (
    scenario.constraints?.maxLeadTimeDays !== undefined &&
    (!Number.isInteger(scenario.constraints.maxLeadTimeDays) || scenario.constraints.maxLeadTimeDays < 0)
  ) {
    add(issues, "constraints.maxLeadTimeDays", "invalid_limit", "maxLeadTimeDays must be a non-negative integer.");
  }
  return issues;
}

export function parseShockScript(text: string): ShockScenario {
  if (new TextEncoder().encode(text).byteLength > 1_000_000) {
    throw new RangeError("ShockScript exceeds the 1 MB safety limit.");
  }
  const value = YAML.parse(text, {
    maxAliasCount: 20,
    prettyErrors: false,
    uniqueKeys: true,
  }) as unknown;
  assertSafeStructure(value);
  const issues = validateScenario(value);
  assertNoErrors("Invalid ShockScript", issues);
  return value as ShockScenario;
}
