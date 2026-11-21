"""Backtest selection of a purchasing input using an archived US BEA annual workbook."""

from __future__ import annotations

import argparse
import json
from hashlib import sha256
from itertools import pairwise
from pathlib import Path
from statistics import mean

from openpyxl import load_workbook

from cascadelens import minimax_regret, replay_switching_costs


def compare(path: Path) -> dict[str, object]:
    with path.open("rb") as file:
        book = load_workbook(file, read_only=True, data_only=True)
        annual: dict[int, dict[str, dict[str, float]]] = {}
        try:
            for sheet in book:
                if not sheet.title.isdigit():
                    continue
                rows = list(sheet.values)
                industries = {i: str(v) for i, v in enumerate(rows[5]) if i >= 2 and v is not None}
                by_industry: dict[str, dict[str, float]] = {}
                for row in rows[7:]:
                    # Use only actual commodity codes that also occur as industry codes.
                    commodity = str(row[0])
                    if commodity not in industries.values():
                        continue
                    for idx, industry in industries.items():
                        value = row[idx]
                        if isinstance(value, (int, float)) and commodity != industry:
                            by_industry.setdefault(industry, {})[commodity] = -float(value)
                annual[int(sheet.title)] = by_industry
        finally:
            book.close()
    outcomes = []
    for year, current in sorted(annual.items()):
        if not all(y in annual for y in (year - 1, year - 2, year - 3)):
            continue
        for industry, realized in current.items():
            history = {str(y): annual[y].get(industry, {}) for y in range(year - 3, year)}
            robust = minimax_regret(history)
            last = history[str(year - 1)]
            if not robust or not last or not realized:
                continue
            robust_choice = robust[0]["option"]
            last_choice = min(last, key=lambda k: (last[k], k))
            if robust_choice not in realized or last_choice not in realized:
                continue
            best = min(realized.values())
            outcomes.append(
                (
                    year,
                    realized[robust_choice] - best,
                    realized[last_choice] - best,
                    robust_choice != last_choice,
                )
            )
    if not outcomes:
        raise ValueError("No comparable industry-years in this workbook")
    # Align the pathwise comparison with the original 2000 onward evaluation horizon.
    years = sorted({r[0] for r in outcomes})
    path_years = [years[0] - 1, *years]
    if any(b != a + 1 for a, b in pairwise(path_years)):
        raise ValueError("switch-cost evaluation requires consecutive annual tables")
    industries_seen = set.union(*(set(annual[y]) for y in path_years))
    panels = []
    for industry in sorted(industries_seen):
        rows = [annual[y].get(industry, {}) for y in path_years]
        if rows[0] and all(row.keys() == rows[0].keys() for row in rows):
            panels.append(rows)
    if not panels:
        raise ValueError("No complete industry panel for the switching-cost comparison")
    cost_sensitivity = []
    for fee in (0.0, 0.001, 0.005, 0.01):
        runs = [replay_switching_costs(rows, fee)["policies"] for rows in panels]
        methods = {}
        for policy in runs[0]:
            gaps = [run[policy]["total_loss"] - run["hindsight_path"]["total_loss"] for run in runs]
            methods[policy] = {
                "switches": sum(run[policy]["switches"] for run in runs),
                "mean_net_gap_to_hindsight": mean(gaps) / len(years),
            }
        cost_sensitivity.append({"switch_cost_in_share_units": fee, "policies": methods})
    return {
        "sha256": sha256(path.read_bytes()).hexdigest(),
        "years": [min(r[0] for r in outcomes), max(r[0] for r in outcomes)],
        "industry_years": len(outcomes),
        "switching_panel": {
            "industries_seen": len(industries_seen),
            "complete_industries": len(panels),
            "evaluation_years": years,
            "sensitivity": cost_sensitivity,
        },
        "different_choices": sum(r[3] for r in outcomes),
        "three_year_minimax_mean_gap": mean(r[1] for r in outcomes),
        "last_year_mean_gap": mean(r[2] for r in outcomes),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workbook", type=Path)
    print(json.dumps(compare(parser.parse_args().workbook), indent=2))
