# NetworkX and notebooks

Install the optional adapter and notebook tools:

```bash
pip install "cascadelens[networkx] @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.5.0"
```

## Convert an existing graph

```python
import networkx as nx
from cascadelens import analyze, default_scenario, graph_from_networkx

graph = nx.DiGraph()
graph.add_edge("supplier", "plant", weight=0.72, lower=0.50, upper=0.86)
graph.add_edge("plant", "market", weight=0.61, lower=0.40, upper=0.78)

snapshot = graph_from_networkx(
    graph,
    decision_cutoff="2026-01-01T00:00:00Z",
)
result = analyze(snapshot, default_scenario(snapshot))
```

`Graph`, `DiGraph`, `MultiGraph`, and `MultiDiGraph` are accepted through the NetworkX protocol. Multigraph edge keys are preserved as properties.

## Notebook

Open [`examples/notebooks/bring_your_own_graph.ipynb`](../../examples/notebooks/bring_your_own_graph.ipynb). It imports the checked CSV example, runs all three bounds, displays a compact impact table, and preserves the `scenario_only` boundary.

## Integration boundary

The adapter copies topology and scalar attributes. It does not infer edge direction, causal meaning, units, evidence grade, or licensing. Review those fields before using a graph for anything beyond a scenario demonstration.
