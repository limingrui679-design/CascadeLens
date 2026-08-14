"""Feasible intervention enumeration and Pareto analysis."""

from __future__ import annotations

from itertools import combinations, pairwise
from typing import Any

from .cascade import first_shock_start, intervention_activation, run_cascade_bounds
from .evidence import can_use
from .temporal import isoformat


def _all_subsets(items: list[dict[str, Any]]):
    if len(items) > 16:
        raise ValueError("At most 16 interventions may be enumerated")
    for size in range(len(items) + 1):
        yield from combinations(items, size)


def _feasibility(scenario: dict[str, Any], selected: tuple[dict[str, Any], ...]) -> list[str]:
    reasons: set[str] = set()
    constraints = scenario.get("constraints", {})
    cost = sum(float(item["cost"]) for item in selected)
    if constraints.get("budget") is not None and cost > float(constraints["budget"]) + 1e-12:
        reasons.add("budget_exceeded")
    if constraints.get("maxInterventions") is not None and len(selected) > int(
        constraints["maxInterventions"]
    ):
        reasons.add("intervention_limit_exceeded")
    if constraints.get("maxLeadTimeDays") is not None and any(
        int(item["leadTimeDays"]) > int(constraints["maxLeadTimeDays"]) for item in selected
    ):
        reasons.add("lead_time_exceeded")
    groups: dict[str, int] = {}
    for item in selected:
        group = item.get("mutuallyExclusiveGroup")
        if group:
            groups[group] = groups.get(group, 0) + 1
        if constraints.get("budgetUnit") and item.get("costUnit") != constraints["budgetUnit"]:
            reasons.add(f"cost_unit_mismatch:{item['id']}")
    for group, count in groups.items():
        if count > 1:
            reasons.add(f"mutually_exclusive:{group}")
    return sorted(reasons)


def _impact(bundle: dict[str, Any], horizon: int | None = None) -> float | None:
    if horizon is None:
        return bundle["worstCaseImpact"]
    match = next(
        (item for item in bundle["horizonResults"] if item["horizonDays"] == horizon), None
    )
    return None if match is None else match["worstCaseImpact"]


def _pareto(bundles: list[dict[str, Any]], horizon: int | None = None) -> list[dict[str, Any]]:
    feasible = [item for item in bundles if item["feasible"] and _impact(item, horizon) is not None]
    frontier = []
    for candidate in feasible:
        candidate_impact = _impact(candidate, horizon)
        dominated = any(
            other is not candidate
            and other["cost"] <= candidate["cost"]
            and _impact(other, horizon) <= candidate_impact
            and (other["cost"] < candidate["cost"] or _impact(other, horizon) < candidate_impact)
            for other in feasible
        )
        if not dominated:
            frontier.append(candidate)
    return sorted(frontier, key=lambda item: (item["cost"], _impact(item, horizon)))


def _best(bundles: list[dict[str, Any]], horizon: int | None = None) -> dict[str, Any] | None:
    eligible = [item for item in bundles if item["feasible"] and _impact(item, horizon) is not None]
    if not eligible:
        return None
    return min(
        eligible, key=lambda item: (_impact(item, horizon), item["cost"], item["interventionIds"])
    )


def _status(scenario: dict[str, Any], bundle: dict[str, Any] | None) -> str:
    if bundle is None:
        return "blocked"
    selected = [
        item for item in scenario["interventions"] if item["id"] in bundle["interventionIds"]
    ]
    if scenario.get("constraints", {}).get("budget") is None:
        return "evidence_required"
    if any(not can_use(item["evidenceGrade"], "primary") for item in selected):
        return "evidence_required"
    return "eligible"


def analyze_interventions(snapshot: dict[str, Any], scenario: dict[str, Any]) -> dict[str, Any]:
    """Enumerate every feasible bundle and return horizon-specific frontiers."""

    evaluated = []
    horizons = sorted(set(scenario["propagation"]["horizonsDays"]))
    horizon_start = first_shock_start(scenario)
    for selected in _all_subsets(scenario.get("interventions", [])):
        reasons = _feasibility(scenario, selected)
        identifiers = sorted(item["id"] for item in selected)
        cost = sum(float(item["cost"]) for item in selected)
        schedule = sorted(
            [
                {
                    "interventionId": item["id"],
                    "activationAt": isoformat(intervention_activation(scenario, item)),
                    "leadTimeDays": item["leadTimeDays"],
                }
                for item in selected
            ],
            key=lambda item: item["interventionId"],
        )
        if reasons:
            evaluated.append(
                {
                    "interventionIds": identifiers,
                    "strategy": "do_not_act" if not selected else "intervene",
                    "cost": cost,
                    "feasible": False,
                    "lowerImpact": None,
                    "centralImpact": None,
                    "upperImpact": None,
                    "worstCaseImpact": None,
                    "activationSchedule": schedule,
                    "horizonResults": [
                        {
                            "horizonDays": days,
                            "lowerImpact": None,
                            "centralImpact": None,
                            "upperImpact": None,
                            "worstCaseImpact": None,
                            "activeInterventionIds": [],
                            "pendingInterventionIds": identifiers,
                        }
                        for days in horizons
                    ],
                    "reasons": reasons,
                }
            )
            continue
        bounds = run_cascade_bounds(snapshot, scenario, interventions=list(selected))
        horizon_results = []
        for item in bounds["horizons"]:
            horizon_end = horizon_start.timestamp() + item["horizonDays"] * 86_400
            active = [
                event["interventionId"]
                for event in schedule
                if intervention_activation(
                    scenario,
                    next(value for value in selected if value["id"] == event["interventionId"]),
                ).timestamp()
                < horizon_end
            ]
            horizon_results.append(
                {
                    "horizonDays": item["horizonDays"],
                    "lowerImpact": item["lower"]["totalWeightedImpact"],
                    "centralImpact": item["central"]["totalWeightedImpact"],
                    "upperImpact": item["upper"]["totalWeightedImpact"],
                    "worstCaseImpact": item["upper"]["totalWeightedImpact"],
                    "activeInterventionIds": active,
                    "pendingInterventionIds": [
                        identifier for identifier in identifiers if identifier not in active
                    ],
                }
            )
        evaluated.append(
            {
                "interventionIds": identifiers,
                "strategy": "do_not_act" if not selected else "intervene",
                "cost": cost,
                "feasible": True,
                "lowerImpact": bounds["lower"]["totalWeightedImpact"],
                "centralImpact": bounds["central"]["totalWeightedImpact"],
                "upperImpact": bounds["upper"]["totalWeightedImpact"],
                "worstCaseImpact": bounds["upper"]["totalWeightedImpact"],
                "activationSchedule": schedule,
                "horizonResults": horizon_results,
                "reasons": [],
            }
        )
    evaluated.sort(key=lambda item: (not item["feasible"], item["cost"], item["interventionIds"]))
    baseline = next(item for item in evaluated if not item["interventionIds"])
    best = _best(evaluated)
    frontier = _pareto(evaluated)
    thresholds = []
    for left, right in pairwise(frontier):
        gain = left["worstCaseImpact"] - right["worstCaseImpact"]
        added_cost = right["cost"] - left["cost"]
        if gain > 0 and added_cost >= 0:
            thresholds.append(
                {
                    "parameter": "risk_value_per_unit",
                    "threshold": added_cost / gain,
                    "fromBundleIds": left["interventionIds"],
                    "toBundleIds": right["interventionIds"],
                }
            )
    return {
        "scenarioId": scenario["scenarioId"],
        "evaluatedBundles": evaluated,
        "paretoFrontier": frontier,
        "baselineBundle": baseline,
        "recommendedBundleIds": [] if best is None else best["interventionIds"],
        "recommendationStatus": _status(scenario, best),
        "horizonAnalyses": [
            {
                "horizonDays": days,
                "paretoFrontier": _pareto(evaluated, days),
                "recommendedBundleIds": []
                if _best(evaluated, days) is None
                else _best(evaluated, days)["interventionIds"],
                "recommendationStatus": _status(scenario, _best(evaluated, days)),
            }
            for days in horizons
        ],
        "reversalThresholds": thresholds,
    }
