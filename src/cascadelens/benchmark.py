"""Outcome-separated replay scoring with strict temporal and source gates."""

from __future__ import annotations

import math
from datetime import timedelta
from statistics import mean
from typing import Any

from .temporal import is_datetime, parse_datetime
from .validation import validate_snapshot


def _ranks(values: list[float]) -> list[float]:
    ordered = sorted(enumerate(values), key=lambda item: (item[1], item[0]))
    output = [0.0] * len(values)
    cursor = 0
    while cursor < len(ordered):
        end = cursor + 1
        while end < len(ordered) and ordered[end][1] == ordered[cursor][1]:
            end += 1
        rank = (cursor + 1 + end) / 2
        for index in range(cursor, end):
            output[ordered[index][0]] = rank
        cursor = end
    return output


def _correlation(left: list[float], right: list[float]) -> float:
    left_mean, right_mean = mean(left), mean(right)
    numerator = sum((a - left_mean) * (b - right_mean) for a, b in zip(left, right, strict=True))
    left_sum = sum((a - left_mean) ** 2 for a in left)
    right_sum = sum((b - right_mean) ** 2 for b in right)
    denominator = math.sqrt(left_sum * right_sum)
    return 0.0 if denominator == 0 else numerator / denominator


def _blocked(
    scenario: dict[str, Any], outcomes: list[Any], leakage_issues: list[str], limitation: str
) -> dict[str, Any]:
    return {
        "scenarioId": scenario["scenarioId"],
        "classification": scenario["classification"],
        "status": "blocked",
        "sampleSize": len(outcomes),
        "leakageIssues": leakage_issues,
        "limitations": [limitation],
    }


def score_replay(
    snapshot: dict[str, Any],
    scenario: dict[str, Any],
    bounds: dict[str, Any],
    outcomes: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Score outcome-only observations or return an explicit blocked/scenario status."""

    outcomes = outcomes or []
    leakage_issues = [
        f"{issue.path}: {issue.message}"
        for issue in validate_snapshot(snapshot, replay=True)
        if issue.code in {"future_source", "future_evidence", "outcome_leakage"}
    ]
    source_by_id = {source["id"]: source for source in snapshot["sources"]}
    node_ids = {node["id"] for node in snapshot["nodes"]}
    seen_outcome_keys: set[str] = set()
    shock_start = min(parse_datetime(shock["startsAt"]) for shock in scenario["shocks"])

    for index, outcome in enumerate(outcomes):
        path = f"outcomes[{index}]"
        if not isinstance(outcome, dict):
            leakage_issues.append(f"{path}: outcome must be an object")
            continue
        source = source_by_id.get(outcome.get("sourceId"))
        if source is None:
            leakage_issues.append(f"{path}: unknown source {outcome.get('sourceId')}")
        elif source.get("role") != "outcome":
            leakage_issues.append(f"{path}: source {outcome.get('sourceId')} is not outcome-only")
        if outcome.get("nodeId") not in node_ids:
            leakage_issues.append(f"{path}: unknown node {outcome.get('nodeId')}")
        outcome_key = (
            f"{outcome.get('targetMetric')}:{outcome.get('horizonDays')}:{outcome.get('nodeId')}"
        )
        if outcome_key in seen_outcome_keys:
            leakage_issues.append(f"{path}: duplicate outcome target {outcome_key}")
        else:
            seen_outcome_keys.add(outcome_key)
        if outcome.get("targetMetric") != "time_weighted_mean_node_impact":
            leakage_issues.append(f"{path}: unsupported targetMetric {outcome.get('targetMetric')}")
        horizon = outcome.get("horizonDays")
        if (
            not isinstance(horizon, int)
            or isinstance(horizon, bool)
            or horizon not in scenario["propagation"]["horizonsDays"]
        ):
            leakage_issues.append(f"{path}: horizonDays must match a declared scenario horizon")
        for field in ("windowStart", "windowEnd", "availableAt"):
            if not is_datetime(outcome.get(field)):
                leakage_issues.append(
                    f"{path}: {field} must be an ISO-8601 date-time with timezone"
                )
        if (
            is_datetime(outcome.get("windowStart"))
            and parse_datetime(outcome["windowStart"]) != shock_start
        ):
            leakage_issues.append(
                f"{path}: windowStart must equal the first shock start {shock_start.isoformat()}"
            )
        if (
            is_datetime(outcome.get("windowEnd"))
            and isinstance(horizon, int)
            and parse_datetime(outcome["windowEnd"]) != shock_start + timedelta(days=horizon)
        ):
            leakage_issues.append(
                f"{path}: windowEnd must close the complete {horizon}-day target horizon"
            )
        if (
            is_datetime(outcome.get("availableAt"))
            and is_datetime(outcome.get("windowEnd"))
            and parse_datetime(outcome["availableAt"]) <= parse_datetime(outcome["windowEnd"])
        ):
            leakage_issues.append(f"{path}: availableAt must be after the complete outcome window")
        if (
            source is not None
            and is_datetime(outcome.get("availableAt"))
            and is_datetime(source.get("availableAt"))
            and parse_datetime(outcome["availableAt"]) < parse_datetime(source["availableAt"])
        ):
            leakage_issues.append(f"{path}: availableAt predates the cited outcome source")
        observed = outcome.get("observedImpact")
        if (
            not isinstance(observed, (int, float))
            or isinstance(observed, bool)
            or not math.isfinite(float(observed))
            or not 0 <= observed <= 1
        ):
            leakage_issues.append(f"{path}: observedImpact must be between 0 and 1")

    if leakage_issues:
        return _blocked(
            scenario,
            outcomes,
            leakage_issues,
            "Benchmark scoring was blocked by temporal or source-partition violations.",
        )
    if not outcomes or scenario["classification"] == "synthetic_stress":
        return {
            "scenarioId": scenario["scenarioId"],
            "classification": scenario["classification"],
            "status": "scenario_only",
            "sampleSize": len(outcomes),
            "leakageIssues": [],
            "limitations": ["No comparable separated real-world outcome was available."],
        }

    target = outcomes[0]
    if any(
        item["targetMetric"] != target["targetMetric"]
        or item["horizonDays"] != target["horizonDays"]
        or item["windowStart"] != target["windowStart"]
        or item["windowEnd"] != target["windowEnd"]
        for item in outcomes
    ):
        return _blocked(
            scenario,
            outcomes,
            ["outcomes: every observation must share one metric, horizon, and event-time window"],
            "Benchmark scoring was blocked by incomparable outcome targets.",
        )
    horizon = target["horizonDays"]
    selected = next((item for item in bounds["horizons"] if item["horizonDays"] == horizon), None)
    if selected is None:
        return _blocked(
            scenario,
            outcomes,
            [f"outcomes: no computed bounds exist for horizon {horizon}"],
            "Benchmark scoring was blocked by a missing target horizon.",
        )
    central = {item["nodeId"]: item["impact"] for item in selected["central"]["impacts"]}
    lower = {item["nodeId"]: item["impact"] for item in selected["lower"]["impacts"]}
    upper = {item["nodeId"]: item["impact"] for item in selected["upper"]["impacts"]}
    comparable = [item for item in outcomes if item["nodeId"] in central]
    if len(comparable) < 2:
        return {
            "scenarioId": scenario["scenarioId"],
            "classification": scenario["classification"],
            "status": "scenario_only",
            "sampleSize": len(comparable),
            "leakageIssues": [],
            "limitations": ["Fewer than two comparable outcome nodes were available."],
        }
    predicted = [central[item["nodeId"]] for item in comparable]
    observed = [float(item["observedImpact"]) for item in comparable]
    coverage = mean(
        1.0
        if lower[item["nodeId"]] <= float(item["observedImpact"]) <= upper[item["nodeId"]]
        else 0.0
        for item in comparable
    )
    error = mean(abs(a - b) for a, b in zip(predicted, observed, strict=True))
    baseline = mean(abs(value) for value in observed)
    return {
        "scenarioId": scenario["scenarioId"],
        "classification": scenario["classification"],
        "status": "historically_scored",
        "sampleSize": len(comparable),
        "meanAbsoluteError": error,
        "spearmanRank": _correlation(_ranks(predicted), _ranks(observed)),
        "intervalCoverage": coverage,
        "meanIntervalWidth": mean(
            upper[item["nodeId"]] - lower[item["nodeId"]] for item in comparable
        ),
        "empiricalCoverageCalibrationError": abs(1 - coverage),
        "directionAccuracy": mean(
            1.0 if (prediction >= 0.1) == (actual >= 0.1) else 0.0
            for prediction, actual in zip(predicted, observed, strict=True)
        ),
        "meanRegretVersusZeroBaseline": error - baseline,
        "targetMetric": target["targetMetric"],
        "horizonDays": horizon,
        "outcomeWindow": {"start": target["windowStart"], "end": target["windowEnd"]},
        "leakageIssues": [],
        "limitations": [
            "Replay metrics assess agreement with the selected outcome proxy, not causal impact "
            "or operational adoption."
        ],
    }
