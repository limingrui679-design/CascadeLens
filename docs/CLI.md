# Command-line interface

The CLI validates untrusted input before running the deterministic local engine. It does not silently overwrite output files or directories.

## Validate a ShockScript

```bash
npm run cascadelens -- validate \
  content/cases/suez-route-restress/scenario.json \
  --graph content/cases/suez-route-restress/graph/snapshot.json
```

## Run an analysis

```bash
npm run cascadelens -- run \
  content/cases/suez-route-restress/scenario.json \
  --graph content/cases/suez-route-restress/graph/snapshot.json \
  --out local-results.json
```

The output is explicitly labelled `scenario_output_not_empirical_validation`.

## Create a complete RiskPack

```bash
npm run cascadelens -- pack \
  content/cases/suez-route-restress/scenario.json \
  --graph content/cases/suez-route-restress/graph/snapshot.json \
  --assumptions content/cases/suez-route-restress/assumptions.json \
  --model-card content/cases/suez-route-restress/model-card.json \
  --observation-candidates content/cases/suez-route-restress/riskpack/inputs/observation-candidates.json \
  --out local-riskpack
```

The candidate file is explicit because every observation-candidate weight in the assumption register must bind to the exact input that observability analysis uses. The CLI defaults to an empty historical-outcome set and therefore creates a `scenario_only` pack.

## Verify a RiskPack

```bash
npm run cascadelens -- verify local-riskpack
npm run cascadelens -- cases verify all
```

The successful status is `VERIFIED RECOMPUTED`. Verification checks relative paths, the exact declared file set, every checksum, sealed graph digest, ShockScript contract, strict metadata schemas, exact-byte assumption source, parameter bindings, model-card/benchmark consistency, source manifest, model version, classification, and limitations. It then recomputes cascade bounds, intervention analysis, observability, and benchmark output from the packaged inputs and compares canonical bytes.

To bind the pack to an independently retained receipt, pass its previously recorded pack digest:

```bash
npm run cascadelens -- verify local-riskpack \
  --expected-digest <64-character-sha256>
```

Recomputation detects altered derived results even if every internal checksum is refreshed. The external expected digest additionally detects a self-consistently rebuilt pack with altered inputs. Neither mode proves empirical accuracy, release authorship without an external trust channel, or real-world impact.

## Cases and connectors

```bash
npm run cascadelens -- cases list
npm run cascadelens -- cases build suez-route-restress
npm run cascadelens -- connectors list
npm run cascadelens -- connectors show sec-edgar
npm run cascadelens -- connectors acquire sec-edgar \
  --query sec-query.json \
  --out local-sec-snapshot \
  --user-agent "CascadeLens research contact@example.org"
```

For remote connectors, `acquire` performs bounded fetch, exact-byte hashing, manifest verification, normalization, stable-ID ordering, and conservative WorldGraph snapshot mapping. The generic mapping creates metric nodes only; it never invents dependency edges. Import-only connectors require a lawfully obtained local export through the SDK. Synthetic fixtures remain fictional contract tests. Separately, [`content/snapshots`](../content/snapshots/) contains three dated, lawfully redistributable official-source runs with exact receipts; those runs are not historical outcomes, calibrated inputs, or dependency evidence.
