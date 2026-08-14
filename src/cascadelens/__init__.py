"""CascadeLens: evidence-graded systemic-risk analysis in Python.

The public API intentionally accepts ordinary dictionaries so analysts can
move between JSON, pandas, NetworkX, notebooks, and the command line without a
framework-specific model layer. Validation still fails closed before analysis.
"""

from .analysis import AnalysisResult, analyze
from .canonical import canonicalize, digest_canonical, stable_dumps
from .cascade import run_cascade, run_cascade_bounds
from .imports import (
    graph_from_csv,
    graph_from_graphml,
    graph_from_json,
    graph_from_networkx,
    load_graph,
)
from .interventions import analyze_interventions
from .riskpack import create_riskpack, verify_riskpack
from .scenario import default_scenario, load_scenario, validate_scenario
from .validation import seal_snapshot, validate_snapshot, verify_snapshot
from .version import __version__

__all__ = [
    "AnalysisResult",
    "__version__",
    "analyze",
    "analyze_interventions",
    "canonicalize",
    "create_riskpack",
    "default_scenario",
    "digest_canonical",
    "graph_from_csv",
    "graph_from_graphml",
    "graph_from_json",
    "graph_from_networkx",
    "load_graph",
    "load_scenario",
    "run_cascade",
    "run_cascade_bounds",
    "seal_snapshot",
    "stable_dumps",
    "validate_scenario",
    "validate_snapshot",
    "verify_riskpack",
    "verify_snapshot",
]
