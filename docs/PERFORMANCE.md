# Performance budgets

CascadeLens treats performance claims as bounded release gates, not universal scale promises.

## Measured profiles

- **Bundled local profile:** the sixteen five-node reference cases, 25-run Workbench sensitivity surface, and complete analysis/RiskPack pipeline.
- **Research smoke profile:** a deterministic synthetic chain with 20,000 nodes, 19,999 edges, three evidence bounds, and 7/30-day outputs. It checks algorithmic behavior on a materially larger graph; it is not a real research dataset and does not imply support for every 20,000-node topology.
- **Research/distributed data profiles:** connector partition plans and manifests describe download-on-run or user-managed storage. The repository does not claim that the browser or local in-memory engine loads hundreds of millions of facts.

## Release gates

`npm run test:performance` fails when:

- all built client assets exceed 1.5 MB uncompressed;
- any one client asset exceeds 300 KB uncompressed;
- the 20,000-node research smoke run exceeds 15 seconds;
- its measured RSS increase exceeds 768 MB; or
- any requested time-horizon result is absent.

Budgets are deliberately generous enough for shared CI runners while still catching accidental quadratic traversal, runaway bundles, and client regressions. The command prints actual measurements on every run; it does not commit a machine-specific benchmark as a permanent claim.

The built-in engine recomputes visibility at every event-day boundary. For an acyclic graph, it may reuse an exact daily solution only when the visible graph object, active-shock set, and graph-affecting active-intervention set are identical; any temporal or activation change invalidates that state. Cyclic graphs always use the declared bounded fixed-point solver.
