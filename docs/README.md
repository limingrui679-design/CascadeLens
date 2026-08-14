# CascadeLens documentation

This index routes readers to the contract, evidence, and operating material behind the public product. The root [README](../README.md) is the fastest product overview.

## Evaluate the claims

| Document | Purpose |
|---|---|
| [v0.5.1 presentation and release review](SELF_REVIEW_2026-08-14_v0.5.1.md) | Records the compact workflow, version alignment, full-suite gates, release assets, and public deployment identity. |
| [v0.5.0 relational-data review](SELF_REVIEW_2026-08-14_v0.5.0.md) | Records the BEA topology, evidence-ledger, full-suite, release, and publication checks. |
| [Acceptance matrix](ACCEPTANCE_MATRIX.md) | Maps product requirements to implementation and verification evidence. |
| [v0.4.0 Python-first review](SELF_REVIEW_2026-08-14_v0.4.0.md) | Records five review passes across the Python package, workbench, evidence gates, release, and publication. |
| [v0.3.2 audit-remediation review](SELF_REVIEW_2026-08-13_v0.3.2.md) | Maps independently reproduced software findings to code, adversarial tests, and immutable release evidence. |
| [Initial five-pass review](SELF_REVIEW_2026-08-13.md) | Preserves the pre-patch review record for comparison. |
| [Performance profile](PERFORMANCE.md) | Defines enforced client budgets and the research-scale graph smoke profile. |
| [External validation protocol](EXTERNAL_VALIDATION_PROTOCOL.md) | Defines the prospective replay, independent-review, usability, and adoption evidence gates without claiming they have occurred. |
| [Adoption and validation status](ADOPTION_AND_VALIDATION_STATUS.md) | Keeps current external evidence counts and the exact gate for changing them. |
| [Validation evidence path](validation/README.md) | Provides runnable replay, review, user-study, adoption, and impact packets plus the machine acceptance gate. |
| [Methods and failure conditions](METHODS.md) | Defines equations, evidence bounds, baseline relationships, and blocking conditions. |

Maintainer review is internal software evidence. It is not independent domain validation, a user study, a production deployment, or proof of predictive accuracy.

## Understand the design

| Document | Purpose |
|---|---|
| [Product requirements](PRODUCT_REQUIREMENTS.md) | Normative scope, invariants, non-goals, and acceptance requirements. |
| [Architecture](ARCHITECTURE.md) | Runtime flow, determinism, storage profile, and package boundaries. |
| [Schema compatibility](SCHEMA_COMPATIBILITY.md) | Compatibility policy for ShockScript, WorldGraph, and RiskPack contracts. |
| [Data licenses](DATA_LICENSES.md) | Source-by-source access and redistribution boundaries. |
| [Frozen public snapshots](../content/snapshots/README.md) | Four dated official-source runs with exact payload, lineage, normalization, graph, and license receipts. |
| [Connector data catalog](connectors/DATA_CATALOG.md) | Reviewed catalog of the eleven bounded source connectors. |

## Use CascadeLens

| Document | Purpose |
|---|---|
| [CLI guide](CLI.md) | Validate, run, package, verify, and inspect cases or connectors. |
| [Python API guide](SDK.md) | Use the canonical local analysis surface. |
| [Python quick start](tutorials/01_python_quickstart.md) | Install and generate a verified scenario-only RiskPack. |
| [Bring your own graph](tutorials/02_bring_your_own_graph.md) | Import JSON, CSV, or GraphML. |
| [NetworkX and notebooks](tutorials/03_networkx_and_notebooks.md) | Use an existing graph or Jupyter workflow. |
| [Reference cases](../content/cases/README.md) | Inspect scenario classifications, rebuild commands, and evidence limits. |
| [Checked examples](../examples/README.md) | Run the repository examples. |

## Extend CascadeLens

| Document | Purpose |
|---|---|
| [Extension guide](EXTENDING.md) | Add a connector, engine, or replay pack without weakening contracts. |
| [Connector contract](connectors/CONNECTOR_CONTRACT.md) | Required acquisition, provenance, temporal, license, and failure behavior. |
| [Package map](../packages/README.md) | Internal package responsibilities and dependency direction. |
| [Content map](../content/README.md) | Authored versus generated content and provenance rules. |
| [Contribution guide](../CONTRIBUTING.md) | Contribution types, verification, and evidence expectations. |

## Release and operate

| Document | Purpose |
|---|---|
| [Release process](RELEASE_PROCESS.md) | Tagged release, archive, checksum, SBOM, and detached-verification procedure. |
| [Security policy](../SECURITY.md) | Supported versions and private vulnerability reporting. |
| [CycloneDX SBOM](release/sbom.cdx.json) | Machine-readable software component inventory for the release. |
