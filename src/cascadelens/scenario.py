"""ShockScript parsing, validation, and safe defaults."""

from __future__ import annotations

import json
import math
import re
from datetime import timedelta
from pathlib import Path
from typing import Any

from .errors import ValidationIssue, assert_no_errors
from .evidence import EVIDENCE_GRADES
from .temporal import is_datetime, isoformat, parse_datetime
from .validation import NODE_KINDS, RELATION_KINDS
from .version import SCHEMA_VERSION

CLASSIFICATIONS = {"historical_replay", "quasi_historical", "synthetic_stress"}
SHOCK_OPERATIONS = {
    "multiply_capacity",
    "reduce_supply",
    "increase_demand",
    "add_cost",
    "disable",
    "policy_restrict",
    "financial_stress",
}
INTERVENTION_TYPES = {
    "buffer",
    "diversify",
    "reroute",
    "reserve_release",
    "demand_management",
    "evidence_acquisition",
}
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$")
_TOP_LEVEL_FIELDS = {
    "schemaVersion",
    "scenarioId",
    "title",
    "summary",
    "classification",
    "decisionCutoff",
    "graphSnapshotId",
    "shocks",
    "propagation",
    "interventions",
    "objectives",
    "constraints",
    "limitations",
}
_SHOCK_FIELDS = {
    "id",
    "label",
    "target",
    "operation",
    "magnitude",
    "unit",
    "startsAt",
    "endsAt",
    "rationale",
    "sourceIds",
}
_TARGET_FIELDS = {"ids", "edgeIds", "kind", "relation", "jurisdiction", "propertyEquals"}
_PROPAGATION_FIELDS = {
    "engine",
    "transmission",
    "maxIterations",
    "tolerance",
    "horizonsDays",
    "bounds",
}
_INTERVENTION_FIELDS = {
    "id",
    "label",
    "type",
    "targetNodeIds",
    "targetEdgeIds",
    "cost",
    "costUnit",
    "leadTimeDays",
    "effect",
    "mutuallyExclusiveGroup",
    "evidenceGrade",
    "rationale",
}
_OBJECTIVE_FIELDS = {"id", "metric", "sense", "weight", "threshold"}
_CONSTRAINT_FIELDS = {"budget", "budgetUnit", "maxInterventions", "maxLeadTimeDays"}


def _add(issues: list[ValidationIssue], path: str, code: str, message: str) -> None:
    issues.append(ValidationIssue(path, code, message))


def _reject_unknown(
    value: dict[str, Any], allowed: set[str], path: str, issues: list[ValidationIssue]
) -> None:
    for field in sorted(set(value) - allowed):
        location = field if path == "$" else f"{path}.{field}"
        _add(issues, location, "unknown_field", f"Unknown field {field}.")


def _valid_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_ID.fullmatch(value))


def _nonempty_text(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def _finite_number(value: Any) -> bool:
    return (
        isinstance(value, (int, float))
        and not isinstance(value, bool)
        and math.isfinite(float(value))
    )


def validate_scenario(scenario: Any) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    if not isinstance(scenario, dict):
        return [ValidationIssue("$", "invalid_document", "ShockScript must be an object.")]
    _reject_unknown(scenario, _TOP_LEVEL_FIELDS, "$", issues)
    if scenario.get("schemaVersion") != SCHEMA_VERSION:
        _add(issues, "schemaVersion", "unsupported_schema", f"Expected {SCHEMA_VERSION}.")
    for field in ("title", "summary"):
        if not _nonempty_text(scenario.get(field)):
            _add(issues, field, "required", f"{field} is required.")
    for field in ("scenarioId", "graphSnapshotId"):
        if not _valid_id(scenario.get(field)):
            _add(issues, field, "invalid_id", f"{field} must be a valid identifier.")
    if scenario.get("classification") not in CLASSIFICATIONS:
        _add(issues, "classification", "invalid_classification", "Unknown scenario classification.")
    if not is_datetime(scenario.get("decisionCutoff")):
        _add(
            issues,
            "decisionCutoff",
            "invalid_datetime",
            "Expected an ISO-8601 date-time with timezone.",
        )

    shocks = scenario.get("shocks")
    if not isinstance(shocks, list) or not shocks or len(shocks) > 100:
        _add(issues, "shocks", "required", "Use one to 100 shocks.")
        shocks = []
    seen: set[str] = set()
    for index, shock in enumerate(shocks):
        path = f"shocks[{index}]"
        if not isinstance(shock, dict):
            _add(issues, path, "invalid_shock", "Shock must be an object.")
            continue
        _reject_unknown(shock, _SHOCK_FIELDS, path, issues)
        if not _valid_id(shock.get("id")) or shock.get("id") in seen:
            _add(issues, f"{path}.id", "invalid_id", "Shock id is required and must be unique.")
        else:
            seen.add(shock["id"])
        for field in ("label", "unit", "rationale"):
            if not _nonempty_text(shock.get(field)):
                _add(issues, f"{path}.{field}", "required", f"{field} is required.")
        if shock.get("operation") not in SHOCK_OPERATIONS:
            _add(issues, f"{path}.operation", "invalid_operation", "Unknown shock operation.")
        magnitude = shock.get("magnitude")
        if not _finite_number(magnitude) or magnitude < 0:
            _add(
                issues, f"{path}.magnitude", "invalid_magnitude", "Magnitude must be non-negative."
            )
        if not is_datetime(shock.get("startsAt")):
            _add(
                issues,
                f"{path}.startsAt",
                "invalid_datetime",
                "Expected an ISO date-time with timezone.",
            )
        if shock.get("endsAt") is not None:
            if not is_datetime(shock["endsAt"]):
                _add(
                    issues,
                    f"{path}.endsAt",
                    "invalid_datetime",
                    "Expected an ISO date-time with timezone.",
                )
            elif is_datetime(shock.get("startsAt")) and parse_datetime(
                shock["endsAt"]
            ) <= parse_datetime(shock["startsAt"]):
                _add(
                    issues, f"{path}.endsAt", "invalid_interval", "Shock end must follow its start."
                )
        target = shock.get("target")
        if not isinstance(target, dict) or not any(
            target.get(key)
            for key in ("ids", "edgeIds", "kind", "relation", "jurisdiction", "propertyEquals")
        ):
            _add(issues, f"{path}.target", "empty_target", "A shock needs an id or typed selector.")
        else:
            _reject_unknown(target, _TARGET_FIELDS, f"{path}.target", issues)
            if target.get("kind") is not None and target["kind"] not in NODE_KINDS:
                _add(issues, f"{path}.target.kind", "invalid_node_kind", "Unknown node kind.")
            if target.get("relation") is not None and target["relation"] not in RELATION_KINDS:
                _add(
                    issues, f"{path}.target.relation", "invalid_relation", "Unknown relation kind."
                )
            for field in ("ids", "edgeIds"):
                identifiers = target.get(field)
                if identifiers is not None and (
                    not isinstance(identifiers, list)
                    or not identifiers
                    or not all(_valid_id(item) for item in identifiers)
                    or len(identifiers) != len(set(identifiers))
                ):
                    _add(
                        issues,
                        f"{path}.target.{field}",
                        "invalid_ids",
                        f"{field} must contain unique valid identifiers.",
                    )
            property_equals = target.get("propertyEquals")
            if property_equals is not None:
                if not isinstance(property_equals, dict):
                    _add(
                        issues,
                        f"{path}.target.propertyEquals",
                        "invalid_selector",
                        "propertyEquals must be an object.",
                    )
                else:
                    _reject_unknown(
                        property_equals,
                        {"key", "value"},
                        f"{path}.target.propertyEquals",
                        issues,
                    )
                    if (
                        not _nonempty_text(property_equals.get("key"))
                        or "value" not in property_equals
                    ):
                        _add(
                            issues,
                            f"{path}.target.propertyEquals",
                            "invalid_selector",
                            "propertyEquals requires key and value.",
                        )
        source_ids = shock.get("sourceIds")
        if (
            not isinstance(source_ids, list)
            or not all(_valid_id(item) for item in source_ids)
            or len(source_ids) != len(set(source_ids))
        ):
            _add(
                issues,
                f"{path}.sourceIds",
                "invalid_sources",
                "sourceIds must contain unique valid identifiers.",
            )

    propagation = scenario.get("propagation")
    if not isinstance(propagation, dict):
        _add(issues, "propagation", "required", "Propagation settings are required.")
    else:
        _reject_unknown(propagation, _PROPAGATION_FIELDS, "propagation", issues)
        if propagation.get("engine") != "dependency_cascade":
            _add(
                issues,
                "propagation.engine",
                "invalid_engine",
                "Python 0.4 supports dependency_cascade.",
            )
        transmission = propagation.get("transmission")
        if not _finite_number(transmission) or not 0 <= transmission <= 1:
            _add(
                issues,
                "propagation.transmission",
                "invalid_transmission",
                "Transmission must be between 0 and 1.",
            )
        iterations = propagation.get("maxIterations")
        if (
            not isinstance(iterations, int)
            or isinstance(iterations, bool)
            or not 1 <= iterations <= 10_000
        ):
            _add(
                issues,
                "propagation.maxIterations",
                "invalid_iterations",
                "Use 1 to 10000 iterations.",
            )
        tolerance = propagation.get("tolerance")
        if not _finite_number(tolerance) or not 0 < tolerance < 1:
            _add(
                issues,
                "propagation.tolerance",
                "invalid_tolerance",
                "Tolerance must be between 0 and 1.",
            )
        horizons = propagation.get("horizonsDays")
        if (
            not isinstance(horizons, list)
            or not horizons
            or any(
                not isinstance(day, int) or isinstance(day, bool) or day <= 0 for day in horizons
            )
        ):
            _add(
                issues,
                "propagation.horizonsDays",
                "invalid_horizons",
                "Use positive integer horizons.",
            )
        elif len(horizons) != len(set(horizons)):
            _add(
                issues, "propagation.horizonsDays", "duplicate_horizons", "Horizons must be unique."
            )
        bounds = propagation.get("bounds")
        if (
            not isinstance(bounds, list)
            or len(bounds) != 3
            or any(not isinstance(bound, str) for bound in bounds)
            or set(bounds) != {"lower", "central", "upper"}
        ):
            _add(
                issues,
                "propagation.bounds",
                "missing_bounds",
                "Use exactly lower, central, and upper once each.",
            )

    interventions = scenario.get("interventions")
    if not isinstance(interventions, list) or len(interventions) > 16:
        _add(issues, "interventions", "invalid_interventions", "Use zero to 16 interventions.")
        interventions = []
    seen.clear()
    for index, intervention in enumerate(interventions):
        path = f"interventions[{index}]"
        if not isinstance(intervention, dict):
            _add(issues, path, "invalid_intervention", "Intervention must be an object.")
            continue
        _reject_unknown(intervention, _INTERVENTION_FIELDS, path, issues)
        if not _valid_id(intervention.get("id")) or intervention.get("id") in seen:
            _add(
                issues,
                f"{path}.id",
                "invalid_id",
                "Intervention id is required and must be unique.",
            )
        else:
            seen.add(intervention["id"])
        if intervention.get("type") not in INTERVENTION_TYPES:
            _add(issues, f"{path}.type", "invalid_type", "Unknown intervention type.")
        for field in ("label", "costUnit", "rationale"):
            if not _nonempty_text(intervention.get(field)):
                _add(issues, f"{path}.{field}", "required", f"{field} is required.")
        if intervention.get("evidenceGrade") not in EVIDENCE_GRADES:
            _add(
                issues,
                f"{path}.evidenceGrade",
                "invalid_evidence_grade",
                "Unknown evidence grade.",
            )
        for field in ("targetNodeIds", "targetEdgeIds"):
            identifiers = intervention.get(field)
            if (
                not isinstance(identifiers, list)
                or not all(_valid_id(item) for item in identifiers)
                or len(identifiers) != len(set(identifiers))
            ):
                _add(
                    issues,
                    f"{path}.{field}",
                    "invalid_ids",
                    f"{field} must contain unique valid identifiers.",
                )
        for field in ("cost", "effect"):
            value = intervention.get(field)
            maximum = 1 if field == "effect" else float("inf")
            if not _finite_number(value) or not 0 <= value <= maximum:
                _add(
                    issues,
                    f"{path}.{field}",
                    f"invalid_{field}",
                    f"{field} is outside its allowed range.",
                )
        lead = intervention.get("leadTimeDays")
        if not isinstance(lead, int) or isinstance(lead, bool) or lead < 0:
            _add(
                issues,
                f"{path}.leadTimeDays",
                "invalid_lead_time",
                "Lead time must be a non-negative integer.",
            )

    objectives = scenario.get("objectives")
    if not isinstance(objectives, list) or not objectives:
        _add(issues, "objectives", "required", "At least one objective is required.")
        objectives = []
    seen.clear()
    for index, objective in enumerate(objectives):
        path = f"objectives[{index}]"
        if not isinstance(objective, dict):
            _add(issues, path, "invalid_objective", "Objective must be an object.")
            continue
        _reject_unknown(objective, _OBJECTIVE_FIELDS, path, issues)
        if not _valid_id(objective.get("id")) or objective.get("id") in seen:
            _add(issues, f"{path}.id", "invalid_id", "Objective id must be valid and unique.")
        else:
            seen.add(objective["id"])
        if objective.get("metric") not in {
            "residual_impact",
            "cost",
            "concentration",
            "unmet_demand",
        }:
            _add(issues, f"{path}.metric", "invalid_metric", "Unknown objective metric.")
        if objective.get("sense") not in {"minimize", "maximize"}:
            _add(issues, f"{path}.sense", "invalid_sense", "Unknown objective sense.")
        for field in ("weight", "threshold"):
            if field in objective and not _finite_number(objective[field]):
                _add(issues, f"{path}.{field}", "invalid_number", f"{field} must be finite.")

    limitations = scenario.get("limitations")
    if (
        not isinstance(limitations, list)
        or not limitations
        or not all(_nonempty_text(item) for item in limitations)
    ):
        _add(issues, "limitations", "required", "At least one limitation is required.")
    constraints = scenario.get("constraints")
    if not isinstance(constraints, dict):
        _add(issues, "constraints", "invalid_constraints", "constraints must be an object.")
    else:
        _reject_unknown(constraints, _CONSTRAINT_FIELDS, "constraints", issues)
        budget = constraints.get("budget")
        if budget is not None and (not _finite_number(budget) or budget < 0):
            _add(issues, "constraints.budget", "invalid_budget", "Budget must be non-negative.")
        if "budgetUnit" in constraints and not _nonempty_text(constraints.get("budgetUnit")):
            _add(issues, "constraints.budgetUnit", "required", "budgetUnit must be non-empty.")
        for field, maximum in (("maxInterventions", 16), ("maxLeadTimeDays", None)):
            value = constraints.get(field)
            if value is not None and (
                not isinstance(value, int)
                or isinstance(value, bool)
                or value < 0
                or (maximum is not None and value > maximum)
            ):
                _add(issues, f"constraints.{field}", "invalid_constraint", f"{field} is invalid.")
    return issues


def validate_against_snapshot(
    scenario: dict[str, Any], snapshot: dict[str, Any]
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    if scenario.get("graphSnapshotId") != snapshot.get("snapshotId"):
        _add(
            issues, "graphSnapshotId", "snapshot_mismatch", "Scenario references another snapshot."
        )
    if scenario.get("decisionCutoff") != snapshot.get("decisionCutoff"):
        _add(
            issues, "decisionCutoff", "cutoff_mismatch", "Scenario and snapshot cutoffs must match."
        )
    node_ids = {node["id"] for node in snapshot.get("nodes", [])}
    edge_ids = {edge["id"] for edge in snapshot.get("edges", [])}
    source_by_id = {source["id"]: source for source in snapshot.get("sources", [])}
    for index, shock in enumerate(scenario.get("shocks", [])):
        for node_id in shock.get("target", {}).get("ids", []):
            if node_id not in node_ids:
                _add(
                    issues,
                    f"shocks[{index}].target.ids",
                    "unknown_node",
                    f"Unknown node {node_id}.",
                )
        for edge_id in shock.get("target", {}).get("edgeIds", []):
            if edge_id not in edge_ids:
                _add(
                    issues,
                    f"shocks[{index}].target.edgeIds",
                    "unknown_edge",
                    f"Unknown edge {edge_id}.",
                )
        if scenario.get("classification") != "synthetic_stress" and not shock.get("sourceIds"):
            _add(
                issues,
                f"shocks[{index}].sourceIds",
                "missing_sources",
                "Historical stresses need source records.",
            )
        for source_id in shock.get("sourceIds", []):
            source = source_by_id.get(source_id)
            if source is None:
                _add(
                    issues,
                    f"shocks[{index}].sourceIds",
                    "unknown_source",
                    f"Unknown source {source_id}.",
                )
            elif source.get("role") == "outcome":
                _add(
                    issues,
                    f"shocks[{index}].sourceIds",
                    "outcome_leakage",
                    "Outcome sources cannot define shocks.",
                )
    for index, intervention in enumerate(scenario.get("interventions", [])):
        for node_id in intervention.get("targetNodeIds", []):
            if node_id not in node_ids:
                _add(
                    issues,
                    f"interventions[{index}].targetNodeIds",
                    "unknown_node",
                    f"Unknown node {node_id}.",
                )
        for edge_id in intervention.get("targetEdgeIds", []):
            if edge_id not in edge_ids:
                _add(
                    issues,
                    f"interventions[{index}].targetEdgeIds",
                    "unknown_edge",
                    f"Unknown edge {edge_id}.",
                )
    return issues


def load_scenario(path: str | Path) -> dict[str, Any]:
    """Load JSON ShockScript. YAML is intentionally optional and not required."""

    source = Path(path)
    if source.stat().st_size > 1_000_000:
        raise ValueError("ShockScript exceeds the 1 MB limit")
    text = source.read_text(encoding="utf-8")
    try:
        value = json.loads(text)
    except json.JSONDecodeError:
        try:
            import yaml  # type: ignore[import-not-found]
        except ImportError as import_error:
            raise ValueError(
                "ShockScript is not JSON; install cascadelens[yaml] for YAML"
            ) from import_error
        value = yaml.safe_load(text)
    assert_no_errors("Invalid ShockScript", validate_scenario(value))
    return value


def default_scenario(snapshot: dict[str, Any], *, magnitude: float = 0.5) -> dict[str, Any]:
    """Create an explicit scenario-only starter for a user-provided graph."""

    first = snapshot["nodes"][0]
    start = parse_datetime(snapshot["decisionCutoff"]) + timedelta(days=1)
    scenario = {
        "schemaVersion": SCHEMA_VERSION,
        "scenarioId": "user-graph-stress",
        "title": "User-provided graph stress",
        "summary": "A scenario-only starter generated from a user-provided graph.",
        "classification": "synthetic_stress",
        "decisionCutoff": snapshot["decisionCutoff"],
        "graphSnapshotId": snapshot["snapshotId"],
        "shocks": [
            {
                "id": "shock:user-graph:primary",
                "label": f"Stress {first['label']}",
                "target": {"ids": [first["id"]]},
                "operation": "reduce_supply",
                "magnitude": magnitude,
                "unit": "share",
                "startsAt": isoformat(start),
                "rationale": "User-selected scenario parameter; not an observation.",
                "sourceIds": [],
            }
        ],
        "propagation": {
            "engine": "dependency_cascade",
            "transmission": 0.75,
            "maxIterations": 100,
            "tolerance": 1e-9,
            "horizonsDays": [7, 30, 90],
            "bounds": ["lower", "central", "upper"],
        },
        "interventions": [],
        "objectives": [{"id": "objective:risk", "metric": "residual_impact", "sense": "minimize"}],
        "constraints": {},
        "limitations": [
            "User-provided topology and weights are not independently validated.",
            "Outputs are scenarios, not forecasts, causal estimates, or realized losses.",
        ],
    }
    assert_no_errors("Invalid generated ShockScript", validate_scenario(scenario))
    return scenario
