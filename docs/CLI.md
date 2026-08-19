# Python command-line interface

The Python CLI is the primary local entry point. It validates input before analysis, does not silently overwrite outputs, and has no mandatory runtime dependencies.

## Install

```bash
pip install "cascadelens @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.6.0"
```

## Run the complete demonstration

```bash
cascadelens demo --out demo-riskpack
```

This runs a packaged scenario, creates a checksummed RiskPack, recomputes every analytical output, and prints the retained pack digest.

## Import your graph

```bash
cascadelens import-graph network.csv --out worldgraph.json
cascadelens import-graph network.graphml --out worldgraph.json
cascadelens import-graph network.json --out worldgraph.json
```

CSV uses `source,target,weight`; JSON accepts a full WorldGraph or simple nodes and edges; GraphML reads standard node and edge data keys. Imported dependencies remain `MODEL_INFERRED` until separately supported and reviewed.

## Validate and run

```bash
cascadelens validate --graph worldgraph.json
cascadelens validate --graph worldgraph.json --scenario shockscript.json

cascadelens run \
  --graph worldgraph.json \
  --scenario shockscript.json \
  --out analysis.json
```

Omit `--scenario` to generate an explicit synthetic starter shock on the first node. Output is labelled `scenario_output_not_empirical_validation`.

## Create and verify a RiskPack

```bash
cascadelens pack \
  --graph worldgraph.json \
  --scenario shockscript.json \
  --out local-riskpack

cascadelens verify local-riskpack
```

Successful verification prints `VERIFIED RECOMPUTED`. It checks safe paths, the exact file set, checksums, snapshot digest, WorldGraph and ShockScript contracts, and deterministic recomputation of bounds, interventions, and benchmark status.

Bind the pack to a digest retained outside the pack:

```bash
cascadelens verify local-riskpack --expected-digest <64-character-sha256>
```

Recomputation detects changed derived results even when internal checksums are refreshed. An external digest additionally detects a self-consistently rebuilt pack with changed inputs. Neither proves empirical accuracy, authorship without an external trust channel, adoption, or realized impact.

## Hosted-demo maintenance

The TypeScript CLI remains available for maintainers rebuilding the 16 reviewed website cases, capability matrix, Workbench bundle, and bounded connector fixtures:

```bash
npm run cascadelens -- cases list
npm run cascadelens -- cases build suez-route-restress
npm run cascadelens -- connectors list
```

It is a compatibility and content-build surface, not the recommended first installation path.

See [Python quick start](tutorials/01_python_quickstart.md), [bring your own graph](tutorials/02_bring_your_own_graph.md), and [methods](METHODS.md).
