# Checked examples

The examples are executable parts of repository verification, not snippets allowed to drift.

## Python: 60-second result

```bash
pip install "cascadelens @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.5.0"
cascadelens demo --out demo-riskpack
```

Then run the checked API examples:

```bash
python examples/python/quickstart.py
python examples/python/bring_your_own_graph.py
```

Available inputs:

- [`data/simple_edges.csv`](data/simple_edges.csv)
- [`data/simple_graph.graphml`](data/simple_graph.graphml)
- [`notebooks/bring_your_own_graph.ipynb`](notebooks/bring_your_own_graph.ipynb)
- [`python/networkx_adapter.py`](python/networkx_adapter.py), with the optional NetworkX extra

## Hosted-demo TypeScript compatibility

[`typescript/analyze-reference-case.ts`](typescript/analyze-reference-case.ts) loads the Suez reference graph and ShockScript, runs the offline SDK pipeline, checks the expected `scenario_only` benchmark status, and verifies the published RiskPack.

```bash
npm ci
npm run example:sdk
```

Expected output identifies the case, snapshot digest, bounded impact, intervention count, benchmark status, and RiskPack verification result. A successful example proves the checked software path and artifact integrity; it does not prove empirical accuracy.

For other interfaces, see the [CLI guide](../docs/CLI.md), [Python API](../docs/SDK.md), [tutorials](../docs/tutorials/), and [live product](https://cascadelens.limingrui2.chatgpt.site).
