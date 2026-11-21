"""Sequential decisions with a switching penalty and a pathwise hindsight comparator."""

from collections.abc import Sequence
from math import fsum, isfinite
from typing import Any


def replay_switching_costs(
    losses: Sequence[dict[str, float]], switching_cost: float
) -> dict[str, Any]:
    """Evaluate policies that select before observing each next loss vector.

    The first vector is for initialization. All paths start from its lowest-loss option.
    A change incurs the same nonnegative fee, in loss units, for every option pair.
    """
    if isinstance(switching_cost, bool) or not isfinite(switching_cost) or switching_cost < 0:
        raise ValueError("switching_cost must be finite and nonnegative")
    if len(losses) < 2 or not losses[0]:
        raise ValueError("provide an initial period and at least one evaluation period")
    options = sorted(losses[0])
    if any(row.keys() != losses[0].keys() for row in losses):
        raise ValueError("all periods must observe the same options")
    if any(not isfinite(value) for row in losses for value in row.values()):
        raise ValueError("all losses must be finite")

    start = min(options, key=lambda option: (losses[0][option], option))
    sticky: list[str] = []
    last_best: list[str] = []
    incumbent = start
    for prior in losses[:-1]:
        challenger = min(options, key=lambda option: (prior[option], option))
        if prior[incumbent] - prior[challenger] > switching_cost:
            incumbent = challenger
        sticky.append(incumbent)
        last_best.append(challenger)

    # The best route ending at j either stays at j or pays to leave the cheapest prefix.
    costs = {start: 0.0}
    predecessors = []
    for row in losses[1:]:
        cheapest = min(costs, key=lambda option: (costs[option], option))
        move = costs[cheapest] + switching_cost
        previous = {
            option: option if costs.get(option, float("inf")) <= move else cheapest
            for option in options
        }
        costs = {
            option: row[option] + costs[parent] + (switching_cost if parent != option else 0.0)
            for option, parent in previous.items()
        }
        predecessors.append(previous)
    selected = min(options, key=lambda option: (costs[option], option))
    backwards = []
    for parents in reversed(predecessors):
        backwards.append(selected)
        selected = parents[selected]

    def score(path: list[str]) -> dict[str, Any]:
        switches = sum(a != b for a, b in zip([start, *path[:-1]], path, strict=True))
        realized = fsum(row[choice] for row, choice in zip(losses[1:], path, strict=True))
        return {
            "choices": path,
            "switches": switches,
            "realized_loss": realized,
            "total_loss": realized + switches * switching_cost,
        }

    return {
        "initial_option": start,
        "periods": len(losses) - 1,
        "switching_cost": switching_cost,
        "policies": {
            "hold_initial": score([start] * len(sticky)),
            "follow_last": score(last_best),
            "cost_hurdle": score(sticky),
            "hindsight_path": score(list(reversed(backwards))),
        },
    }
