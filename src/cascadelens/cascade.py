"""Deterministic daily dependency-cascade engine."""

from __future__ import annotations

from collections import defaultdict, deque
from collections.abc import Iterable
from datetime import timedelta
from typing import Any, Literal

from .errors import assert_no_errors
from .evidence import EVIDENCE_GRADES, Bound, included_in_bound
from .scenario import validate_against_snapshot, validate_scenario
from .temporal import is_known_at, is_valid_at, isoformat, parse_datetime
from .validation import audit_flow_conservation, edge_weight, verify_snapshot
from .version import ENGINE_VERSION

DAY = timedelta(days=1)


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _combine(values: Iterable[float]) -> float:
    remaining = 1.0
    found = False
    for value in values:
        found = True
        remaining *= 1.0 - _clamp(value)
    return _clamp(1.0 - remaining) if found else 0.0


def _combine_reduction(existing: float, added: float) -> float:
    return 1.0 - (1.0 - _clamp(existing)) * (1.0 - _clamp(added))


def _numeric(node: dict[str, Any], key: str, fallback: float) -> float:
    value = node.get("properties", {}).get(key)
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    return fallback


def _shock_severity(shock: dict[str, Any]) -> float:
    operation = shock["operation"]
    magnitude = float(shock["magnitude"])
    if operation == "multiply_capacity":
        return _clamp(1 - magnitude)
    if operation in {"reduce_supply", "policy_restrict", "financial_stress", "add_cost"}:
        return _clamp(magnitude)
    if operation == "increase_demand":
        return _clamp(1 - 1 / (1 + magnitude))
    if operation == "disable":
        return 1.0
    raise ValueError(f"Unsupported shock operation {operation}")


def first_shock_start(scenario: dict[str, Any]):
    return min(parse_datetime(shock["startsAt"]) for shock in scenario["shocks"])


def intervention_activation(scenario: dict[str, Any], intervention: dict[str, Any]):
    return parse_datetime(scenario["decisionCutoff"]) + timedelta(
        days=int(intervention["leadTimeDays"])
    )


def _select_nodes(snapshot: dict[str, Any], target: dict[str, Any]) -> list[dict[str, Any]]:
    identifiers = set(target.get("ids", [])) if target.get("ids") else None
    output = []
    for node in snapshot["nodes"]:
        if identifiers is not None and node["id"] not in identifiers:
            continue
        if target.get("kind") and node["kind"] != target["kind"]:
            continue
        if target.get("jurisdiction") and node.get("jurisdiction") != target["jurisdiction"]:
            continue
        prop = target.get("propertyEquals")
        if prop and node.get("properties", {}).get(prop.get("key")) != prop.get("value"):
            continue
        output.append(node)
    return output


def _select_edges(snapshot: dict[str, Any], target: dict[str, Any]) -> list[dict[str, Any]]:
    identifiers = set(target.get("edgeIds", [])) if target.get("edgeIds") else None
    output = []
    for edge in snapshot["edges"]:
        if identifiers is not None and edge["id"] not in identifiers:
            continue
        if target.get("relation") and edge["relation"] != target["relation"]:
            continue
        output.append(edge)
    return output


def _visible(snapshot: dict[str, Any], current, known_at: str):
    valid_at = isoformat(current)
    nodes = [
        node
        for node in snapshot["nodes"]
        if is_known_at(node, known_at) and is_valid_at(node, valid_at)
    ]
    node_ids = {node["id"] for node in nodes}
    edges = [
        edge
        for edge in snapshot["edges"]
        if edge["from"] in node_ids
        and edge["to"] in node_ids
        and is_known_at(edge, known_at)
        and is_valid_at(edge, valid_at)
    ]
    return nodes, edges, node_ids, {edge["id"] for edge in edges}


def _topological_order(
    nodes: list[dict[str, Any]], edges: list[dict[str, Any]]
) -> list[dict[str, Any]] | None:
    by_id = {node["id"]: node for node in nodes}
    degree = {node["id"]: 0 for node in nodes}
    outgoing: dict[str, list[str]] = defaultdict(list)
    for edge in edges:
        degree[edge["to"]] += 1
        outgoing[edge["from"]].append(edge["to"])
    queue = deque(node["id"] for node in nodes if degree[node["id"]] == 0)
    ordered: list[dict[str, Any]] = []
    while queue:
        node_id = queue.popleft()
        ordered.append(by_id[node_id])
        for target in outgoing[node_id]:
            degree[target] -= 1
            if degree[target] == 0:
                queue.append(target)
    return ordered if len(ordered) == len(nodes) else None


def _intervention_effects(
    scenario: dict[str, Any],
    interventions: list[dict[str, Any]],
    current,
) -> tuple[dict[str, float], dict[str, float]]:
    node_effects: dict[str, float] = {}
    edge_effects: dict[str, float] = {}
    for intervention in interventions:
        if intervention["type"] == "evidence_acquisition":
            continue
        if current < intervention_activation(scenario, intervention):
            continue
        effect = float(intervention["effect"])
        for node_id in intervention.get("targetNodeIds", []):
            node_effects[node_id] = _combine_reduction(node_effects.get(node_id, 0), effect)
        for edge_id in intervention.get("targetEdgeIds", []):
            edge_effects[edge_id] = _combine_reduction(edge_effects.get(edge_id, 0), effect)
    return node_effects, edge_effects


def _adjusted_weight(edge: dict[str, Any], bound: Bound, effects: dict[str, float]) -> float:
    return edge_weight(edge, bound) * (1.0 - effects.get(edge["id"], 0.0))


def _validate_inputs(snapshot: dict[str, Any], scenario: dict[str, Any]) -> None:
    assert_no_errors("Invalid WorldGraph snapshot", verify_snapshot(snapshot))
    assert_no_errors("Invalid ShockScript", validate_scenario(scenario))
    assert_no_errors(
        "Scenario and snapshot are incompatible", validate_against_snapshot(scenario, snapshot)
    )


def _run_bound_series(
    snapshot: dict[str, Any],
    scenario: dict[str, Any],
    bound: Bound,
    horizons: list[int],
    interventions: list[dict[str, Any]],
) -> dict[int, dict[str, Any]]:
    maximum = max(horizons)
    horizon_set = set(horizons)
    base = first_shock_start(scenario)
    cutoff = scenario["decisionCutoff"]
    transmission = float(scenario["propagation"]["transmission"])
    max_iterations = int(scenario["propagation"]["maxIterations"])
    tolerance = float(scenario["propagation"]["tolerance"])
    prepared_shocks = []
    base_warnings: list[str] = []
    for shock in scenario["shocks"]:
        target = shock["target"]
        has_node_selector = any(
            target.get(key) for key in ("ids", "kind", "jurisdiction", "propertyEquals")
        )
        has_edge_selector = any(target.get(key) for key in ("edgeIds", "relation"))
        nodes = _select_nodes(snapshot, target) if has_node_selector else []
        edges = _select_edges(snapshot, target) if has_edge_selector else []
        if not nodes and not edges:
            base_warnings.append(f"Shock {shock['id']} matched no graph nodes or edges.")
        prepared_shocks.append(
            {
                "id": shock["id"],
                "start": parse_datetime(shock["startsAt"]),
                "end": parse_datetime(shock["endsAt"]) if shock.get("endsAt") else None,
                "node_ids": [node["id"] for node in nodes],
                "edges": edges,
                "severity": _shock_severity(shock),
            }
        )

    all_node_ids = [node["id"] for node in snapshot["nodes"]]
    impacts = dict.fromkeys(all_node_ids, 0.0)
    accumulated = dict.fromkeys(all_node_ids, 0.0)
    accumulated_direct = dict.fromkeys(all_node_ids, 0.0)
    peaks = dict.fromkeys(all_node_ids, 0.0)
    peak_direct = dict.fromkeys(all_node_ids, 0.0)
    peak_contributions: dict[str, list[dict[str, Any]]] = {}
    ever_visible: set[str] = set()
    excluded: dict[str, set[str]] = {grade: set() for grade in EVIDENCE_GRADES}
    activated: set[str] = set()
    all_converged = True
    total_solver_iterations = 0
    maximum_solver_iterations = 0
    eligible_edge_visible = False
    results: dict[int, dict[str, Any]] = {}

    def build_result(days: int) -> dict[str, Any]:
        output_nodes = [node for node in snapshot["nodes"] if node["id"] in ever_visible]
        node_impacts = []
        for node in output_nodes:
            node_id = node["id"]
            node_impacts.append(
                {
                    "nodeId": node_id,
                    "impact": accumulated[node_id] / days,
                    "peakImpact": peaks[node_id],
                    "endImpact": impacts[node_id],
                    "directImpact": accumulated_direct[node_id] / days,
                    "peakDirectImpact": peak_direct[node_id],
                    "contributions": peak_contributions.get(node_id, []),
                }
            )
        node_impacts.sort(key=lambda item: (-item["impact"], item["nodeId"].encode("utf-8")))
        criticality = {
            node["id"]: max(0.0, _numeric(node, "criticality", 1.0)) for node in output_nodes
        }
        denominator = sum(criticality.values())
        mean = (
            sum((accumulated[node["id"]] / days) * criticality[node["id"]] for node in output_nodes)
            / denominator
            if denominator
            else 0.0
        )
        peak = (
            sum(peaks[node["id"]] * criticality[node["id"]] for node in output_nodes) / denominator
            if denominator
            else 0.0
        )
        end = (
            sum(impacts[node["id"]] * criticality[node["id"]] for node in output_nodes)
            / denominator
            if denominator
            else 0.0
        )
        warnings = list(base_warnings)
        if not all_converged:
            warnings.append(
                "At least one daily fixed-point solve reached maxIterations before tolerance."
            )
        for shock in prepared_shocks:
            if shock["id"] not in activated:
                warnings.append(f"Shock {shock['id']} begins after the {days}-day horizon.")
        if not eligible_edge_visible:
            warnings.append("No eligible dependency edges were visible for this bound.")
        for issue in audit_flow_conservation(snapshot, bound):
            warnings.append(
                f"Incoming {issue['relation']} shares for {issue['nodeId']} exceed one "
                f"by {issue['excess']:.6f}."
            )
        return {
            "engineVersion": ENGINE_VERSION,
            "scenarioId": scenario["scenarioId"],
            "snapshotDigest": snapshot["contentDigest"],
            "bound": bound,
            "metric": "time_weighted_mean_node_impact",
            "horizonDays": days,
            "converged": all_converged,
            "iterations": total_solver_iterations,
            "simulatedDays": days,
            "maxSolverIterationsUsed": maximum_solver_iterations,
            "totalWeightedImpact": mean,
            "totalWeightedPeakEnvelope": peak,
            "endWeightedImpact": end,
            "impacts": node_impacts,
            "excludedEdgeCounts": {grade: len(excluded[grade]) for grade in EVIDENCE_GRADES},
            "warnings": warnings,
        }

    for step in range(maximum):
        current = base + timedelta(days=step)
        nodes, visible_edges, node_ids, edge_ids = _visible(snapshot, current, cutoff)
        ever_visible.update(node_ids)
        for node_id in all_node_ids:
            if node_id not in node_ids:
                impacts[node_id] = 0.0
        node_effects, edge_effects = _intervention_effects(scenario, interventions, current)
        eligible_edges = []
        for edge in visible_edges:
            grade = edge["evidence"]["grade"]
            if included_in_bound(grade, bound):
                eligible_edges.append(edge)
                eligible_edge_visible = True
            else:
                excluded[grade].add(edge["id"])
        incoming: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for edge in eligible_edges:
            incoming[edge["to"]].append(edge)

        direct: dict[str, float] = {}
        for shock in prepared_shocks:
            if current < shock["start"] or (shock["end"] is not None and current >= shock["end"]):
                continue
            activated.add(shock["id"])
            for node_id in shock["node_ids"]:
                if node_id in node_ids:
                    direct[node_id] = _combine((direct.get(node_id, 0.0), shock["severity"]))
            for edge in shock["edges"]:
                if edge["id"] not in edge_ids or not included_in_bound(
                    edge["evidence"]["grade"], bound
                ):
                    continue
                severity = _clamp(shock["severity"] * _adjusted_weight(edge, bound, edge_effects))
                direct[edge["to"]] = _combine((direct.get(edge["to"], 0.0), severity))

        order = _topological_order(nodes, eligible_edges)
        final_contributions: dict[str, list[dict[str, Any]]] = {}
        daily_iterations = 0
        daily_converged = False
        if order is not None:
            next_impacts: dict[str, float] = {}
            for node in order:
                node_id = node["id"]
                contributions = []
                for edge in incoming[node_id]:
                    value = _clamp(
                        next_impacts.get(edge["from"], 0.0)
                        * _adjusted_weight(edge, bound, edge_effects)
                        * transmission
                    )
                    if value > 0:
                        contributions.append(
                            {
                                "edgeId": edge["id"],
                                "fromNodeId": edge["from"],
                                "contribution": value,
                            }
                        )
                buffer = _combine_reduction(
                    _clamp(_numeric(node, "bufferShare", 0.0)),
                    node_effects.get(node_id, 0.0),
                )
                propagated = _combine(item["contribution"] for item in contributions) * (1 - buffer)
                next_impacts[node_id] = _combine((direct.get(node_id, 0.0), propagated))
                final_contributions[node_id] = sorted(
                    contributions, key=lambda item: -item["contribution"]
                )[:8]
            impacts.update(next_impacts)
            daily_iterations = 1
            daily_converged = True
        else:
            for iteration in range(1, max_iterations + 1):
                daily_iterations = iteration
                next_impacts = dict(impacts)
                next_contributions: dict[str, list[dict[str, Any]]] = {}
                maximum_change = 0.0
                for node in nodes:
                    node_id = node["id"]
                    contributions = []
                    for edge in incoming[node_id]:
                        value = _clamp(
                            impacts.get(edge["from"], 0.0)
                            * _adjusted_weight(edge, bound, edge_effects)
                            * transmission
                        )
                        if value > 0:
                            contributions.append(
                                {
                                    "edgeId": edge["id"],
                                    "fromNodeId": edge["from"],
                                    "contribution": value,
                                }
                            )
                    buffer = _combine_reduction(
                        _clamp(_numeric(node, "bufferShare", 0.0)),
                        node_effects.get(node_id, 0.0),
                    )
                    propagated = _combine(item["contribution"] for item in contributions) * (
                        1 - buffer
                    )
                    candidate = _combine((direct.get(node_id, 0.0), propagated))
                    maximum_change = max(maximum_change, abs(candidate - impacts.get(node_id, 0.0)))
                    next_impacts[node_id] = candidate
                    next_contributions[node_id] = sorted(
                        contributions, key=lambda item: -item["contribution"]
                    )[:8]
                impacts.update(next_impacts)
                final_contributions = next_contributions
                if maximum_change < tolerance:
                    daily_converged = True
                    break
        total_solver_iterations += daily_iterations
        maximum_solver_iterations = max(maximum_solver_iterations, daily_iterations)
        if not daily_converged:
            all_converged = False
        for node_id in all_node_ids:
            value = impacts.get(node_id, 0.0) if node_id in node_ids else 0.0
            direct_value = direct.get(node_id, 0.0) if node_id in node_ids else 0.0
            accumulated[node_id] += value
            accumulated_direct[node_id] += direct_value
            if value > peaks[node_id] + 1e-15:
                peaks[node_id] = value
                peak_direct[node_id] = direct_value
                peak_contributions[node_id] = final_contributions.get(node_id, [])
        elapsed = step + 1
        if elapsed in horizon_set:
            results[elapsed] = build_result(elapsed)
    return results


def run_cascade_bounds(
    snapshot: dict[str, Any],
    scenario: dict[str, Any],
    *,
    interventions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Run lower, central, and upper bounds for every declared horizon."""

    _validate_inputs(snapshot, scenario)
    horizons = sorted(set(int(day) for day in scenario["propagation"]["horizonsDays"]))
    selected = interventions or []
    series = {
        bound: _run_bound_series(snapshot, scenario, bound, horizons, selected)
        for bound in ("lower", "central", "upper")
    }
    horizon_results = [
        {
            "horizonDays": days,
            "lower": series["lower"][days],
            "central": series["central"][days],
            "upper": series["upper"][days],
        }
        for days in horizons
    ]
    final = horizon_results[-1]
    lower_by_node = {item["nodeId"]: item["impact"] for item in final["lower"]["impacts"]}
    central_by_node = {item["nodeId"]: item["impact"] for item in final["central"]["impacts"]}
    for item in final["upper"]["impacts"]:
        lower = lower_by_node.get(item["nodeId"], 0.0)
        central = central_by_node.get(item["nodeId"], 0.0)
        if lower > central + 1e-12 or central > item["impact"] + 1e-12:
            raise RuntimeError(f"Non-monotone impact bounds for {item['nodeId']}")
    return {
        "lower": final["lower"],
        "central": final["central"],
        "upper": final["upper"],
        "horizons": horizon_results,
    }


def run_cascade(
    snapshot: dict[str, Any],
    scenario: dict[str, Any],
    bound: Literal["lower", "central", "upper"] = "central",
    *,
    horizon_days: int | None = None,
    interventions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Run one requested bound and horizon."""

    _validate_inputs(snapshot, scenario)
    horizon = horizon_days or max(scenario["propagation"]["horizonsDays"])
    if not isinstance(horizon, int) or horizon <= 0:
        raise ValueError("horizon_days must be a positive integer")
    return _run_bound_series(snapshot, scenario, bound, [horizon], interventions or [])[horizon]
