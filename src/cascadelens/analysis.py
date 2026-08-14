"""High-level Python analysis API."""

from __future__ import annotations

from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from typing import Any

from .benchmark import score_replay
from .cascade import run_cascade_bounds
from .interventions import analyze_interventions


@dataclass(frozen=True, slots=True)
class AnalysisResult(Mapping[str, Any]):
    """Immutable result with both attributes and mapping access."""

    bounds: dict[str, Any]
    interventions: dict[str, Any]
    benchmark: dict[str, Any]

    def __getitem__(self, key: str) -> Any:
        return getattr(self, key)

    def __iter__(self) -> Iterator[str]:
        return iter(("bounds", "interventions", "benchmark"))

    def __len__(self) -> int:
        return 3

    def as_dict(self) -> dict[str, Any]:
        return {
            "bounds": self.bounds,
            "interventions": self.interventions,
            "benchmark": self.benchmark,
        }


def analyze(
    snapshot: dict[str, Any],
    scenario: dict[str, Any],
    *,
    outcomes: list[dict[str, Any]] | None = None,
) -> AnalysisResult:
    """Run bounds, feasible interventions, and outcome-separated scoring."""

    bounds = run_cascade_bounds(snapshot, scenario)
    interventions = analyze_interventions(snapshot, scenario)
    benchmark = score_replay(snapshot, scenario, bounds, outcomes)
    return AnalysisResult(bounds, interventions, benchmark)
