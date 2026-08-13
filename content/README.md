# Content and provenance map

`content/` separates reviewed source records and authored scenario definitions from deterministic build outputs. Generated files are committed so reviewers can inspect and verify the exact public artifacts without contacting external services.

## Directory map

| Path | Contents | Authorship status |
|---|---|---|
| [`sources/`](sources/) | Reviewed source and license records used by the catalog | Authored and reviewed |
| [`scenarios/`](scenarios/) | Scenario-level source definitions | Authored and reviewed |
| [`cases/`](cases/) | Per-case scenario, graph, assumptions, model card, results, and RiskPack | Mixed: authored inputs plus deterministic outputs |
| [`catalog/`](catalog/) | Public connector catalog | Deterministically generated from reviewed source records |

Every case records its classification separately from its scoring status. In the launch library, 9 cases are `quasi_historical` and 3 are `synthetic_stress`, but all 12 are `scenario_only`. Public event records provide context only; the case topology and numeric parameters are explicit model assumptions.

## Rebuild and verify

```bash
npm run generate:catalog
npm run generate:cases
npm run cascadelens -- cases verify all
```

The build is deterministic against the same repository tree. RiskPack verification checks file membership, checksums, graph digests, schema contracts, identifiers, manifests, classifications, and rebuild commands. It establishes internal integrity and reproducibility—not empirical accuracy, external validation, deployment, or adoption.

## Adding content

Read the [extension guide](../docs/EXTENDING.md), [connector contract](../docs/connectors/CONNECTOR_CONTRACT.md), [data-license ledger](../docs/DATA_LICENSES.md), and [contribution guide](../CONTRIBUTING.md) before adding a source, connector, or case. Never commit credentials, restricted raw payloads, personal data, or a stronger evidence label than the source record supports.
