# Content and provenance map

`content/` contains deterministic public catalogs and complete built reference cases. Generated files are committed so reviewers can inspect and verify the exact public artifacts without contacting external services; their authored specifications remain in the corresponding package source.

## Directory map

| Path | Contents | Source of truth |
|---|---|---|
| [`cases/`](cases/) | Per-case scenario, graph, assumptions, context citation, model card, results, and RiskPack | Deterministically built from [`packages/cases/src/specs.ts`](../packages/cases/src/specs.ts) |
| [`cases/catalog.json`](cases/catalog.json) | Public summary of all twelve reference cases | Generated with the case library |
| [`catalog/connectors.json`](catalog/connectors.json) | Public catalog of the ten bounded connectors | Deterministically exported from [`packages/connectors/src/catalog.ts`](../packages/connectors/src/catalog.ts) |

Every case records its classification separately from its scoring status. In the launch library, 9 cases are `quasi_historical` and 3 are `synthetic_stress`, but all 12 are `scenario_only`. Public event records provide context only; the case topology and numeric parameters are explicit model assumptions recorded in the generated artifacts.

## Rebuild and verify

```bash
npm run generate:catalog
npm run generate:cases
npm run cascadelens -- cases verify all
```

The build is deterministic against the same repository tree. RiskPack verification checks file membership, checksums, graph digests, schema contracts, identifiers, manifests, classifications, and rebuild commands. It establishes internal integrity and reproducibility—not empirical accuracy, external validation, deployment, or adoption.

## Adding content

Read the [extension guide](../docs/EXTENDING.md), [connector contract](../docs/connectors/CONNECTOR_CONTRACT.md), [data-license ledger](../docs/DATA_LICENSES.md), and [contribution guide](../CONTRIBUTING.md) before adding a source, connector, or case. Never commit credentials, restricted raw payloads, personal data, or a stronger evidence label than the source record supports.
