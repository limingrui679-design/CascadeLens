# Bring your own graph

CascadeLens accepts JSON, edge-list CSV, GraphML, and NetworkX. Imported relations default to `MODEL_INFERRED`; import never upgrades user data to observed evidence or asserts redistribution rights.

## CSV

Minimum columns:

```csv
source,target,weight
supplier,plant,0.72
plant,market,0.61
```

Optional columns include `lower`, `upper`, `relation`, `source_label`, and `target_label`.

```bash
cascadelens import-graph examples/data/simple_edges.csv --out my-worldgraph.json
cascadelens run --graph my-worldgraph.json --out my-analysis.json
```

Without `--scenario`, the CLI creates an explicit synthetic stress on the first node. Edit or supply a ShockScript for a real analytical question.

## JSON

Use a sealed WorldGraph directly, or a simple object:

```json
{
  "nodes": [
    {"id": "supplier", "label": "Supplier", "kind": "legal_entity"},
    {"id": "plant", "label": "Plant", "kind": "facility"}
  ],
  "edges": [
    {"source": "supplier", "target": "plant", "weight": 0.72}
  ]
}
```

## GraphML

```bash
cascadelens import-graph examples/data/simple_graph.graphml --out my-worldgraph.json
```

GraphML `label`, `kind`, `weight`, `lower`, `upper`, and `relation` data keys are recognized. Other scalar attributes are preserved as properties.

## Create the first RiskPack

```bash
cascadelens pack --graph my-worldgraph.json --out my-riskpack
cascadelens verify my-riskpack
```

User-provided topology and weights remain unverified assumptions. A valid pack proves integrity and recomputation, not empirical accuracy.

