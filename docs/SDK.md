# Python API

CascadeLens accepts ordinary dictionaries so it works naturally with JSON, notebooks, pandas exports, and NetworkX.

## Analyze a graph

```python
from cascadelens import analyze, default_scenario, load_graph

snapshot = load_graph("network.csv", decision_cutoff="2026-01-01T00:00:00Z")
scenario = default_scenario(snapshot, magnitude=0.6)
result = analyze(snapshot, scenario)

print(result.bounds["lower"]["totalWeightedImpact"])
print(result.bounds["central"]["totalWeightedImpact"])
print(result.bounds["upper"]["totalWeightedImpact"])
print(result.interventions["recommendationStatus"])
print(result.benchmark["status"])
```

Without separated post-event outcomes, benchmark status is `scenario_only`.

## NetworkX

```python
import networkx as nx
from cascadelens import analyze, default_scenario, graph_from_networkx

graph = nx.DiGraph()
graph.add_edge("supplier", "plant", weight=0.72, lower=0.50, upper=0.86)
snapshot = graph_from_networkx(graph, decision_cutoff="2026-01-01T00:00:00Z")
result = analyze(snapshot, default_scenario(snapshot))
```

NetworkX is optional: `pip install "cascadelens[networkx] @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.5.0"`.

## Public functions

| Function | Purpose |
|---|---|
| `load_graph` | Read JSON, CSV, or GraphML |
| `graph_from_networkx` | Normalize a NetworkX-compatible object |
| `seal_snapshot` / `verify_snapshot` | Content-address and validate WorldGraph |
| `load_scenario` / `validate_scenario` | Parse and validate ShockScript |
| `run_cascade` / `run_cascade_bounds` | Execute one bound or all bounds |
| `analyze_interventions` | Enumerate feasible bundles and Pareto frontiers |
| `analyze` | Run bounds, interventions, and benchmark gate |
| `create_riskpack` / `verify_riskpack` | Write and recompute a checksummed evidence pack |

## Stable artifact schemas

- `schemas/worldgraph-0.1.0.schema.json`
- `schemas/shockscript-0.1.0.schema.json`
- `schemas/riskpack-manifest-0.1.0.schema.json`

Python package version `0.5.0` preserves WorldGraph and ShockScript schema version `0.1.0` and engine semantics `0.2.0`. Automated tests compare Python results with all 12 reviewed browser artifacts to numerical tolerance.

## TypeScript compatibility

`packages/core` and `packages/sdk` remain available to the hosted browser interface. They are no longer the recommended user installation route. Cross-runtime agreement is fixture evidence, not external method validation.
