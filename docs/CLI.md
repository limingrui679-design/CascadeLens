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
  --out local-riskpack
```

## Verify a RiskPack

```bash
npm run cascadelens -- verify local-riskpack
npm run cascadelens -- cases verify all
```

Verification checks relative paths, the exact declared file set, every checksum, sealed graph digest, ShockScript contract, cross-file identifiers, source manifest, model version, benchmark classification, status labels, and portable rebuild command. Passing verification proves internal integrity and reproducibility, not empirical accuracy or real-world impact.

## Cases and connectors

```bash
npm run cascadelens -- cases list
npm run cascadelens -- cases build suez-route-restress
npm run cascadelens -- connectors list
npm run cascadelens -- connectors show sec-edgar
```
