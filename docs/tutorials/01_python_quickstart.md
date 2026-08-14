# Python quick start

## 1. Install from the reviewed release

```bash
pip install "cascadelens @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.5.1"
```

Python 3.11 or newer is required. The base package has no mandatory runtime dependencies.

## 2. Generate a complete demonstration

```bash
cascadelens demo --out demo-riskpack
```

The command analyzes a small packaged graph, writes a checksummed RiskPack, and immediately recomputes it. A successful run prints `verified_recomputed_scenario_only` and a pack digest.

## 3. Use the Python API

```python
from cascadelens import analyze
from cascadelens.demo import demo_scenario, demo_snapshot

result = analyze(demo_snapshot(), demo_scenario())
print(result.bounds["upper"]["totalWeightedImpact"])
print(result.interventions["recommendationStatus"])
print(result.benchmark["status"])
```

Expected benchmark status: `scenario_only`. The example checks deterministic software behavior; it is not a historically scored case.

## 4. Verify later

```bash
cascadelens verify demo-riskpack
```

Pass `--expected-digest` with a previously retained digest to detect a self-consistently rebuilt pack whose inputs changed.
