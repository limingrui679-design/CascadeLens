# Acceptance matrix

This file is the completion ledger. A requirement is complete only when the evidence column points to a current, independently inspectable artifact or command output. Passing a narrower test does not prove a broader requirement.

| ID | Requirement | Required evidence | Current status |
|---|---|---|---|
| A01 | WorldGraph schema and validation | [`worldgraph-0.1.0.schema.json`](../schemas/worldgraph-0.1.0.schema.json), [`json-schema.test.ts`](../tests/core/json-schema.test.ts), [`worldgraph.test.ts`](../tests/core/worldgraph.test.ts) | Verified |
| A02 | Bitemporal no-lookahead behavior | [`worldgraph.test.ts`](../tests/core/worldgraph.test.ts), [`benchmark.test.ts`](../tests/core/benchmark.test.ts) | Verified |
| A03 | Evidence-grade eligibility | [`evidence.ts`](../packages/core/src/evidence.ts), [`worldgraph.test.ts`](../tests/core/worldgraph.test.ts), [`cascade.test.ts`](../tests/core/cascade.test.ts) | Verified |
| A04 | ShockScript YAML/JSON contract | [`shockscript-0.1.0.schema.json`](../schemas/shockscript-0.1.0.schema.json), [`shockscript.test.ts`](../tests/core/shockscript.test.ts), [`json-schema.test.ts`](../tests/core/json-schema.test.ts) | Verified |
| A05 | Cascade propagation | [`cascade.test.ts`](../tests/core/cascade.test.ts), [`engines.test.ts`](../tests/core/engines.test.ts) | Verified |
| A06 | MissingGraph bounds | Lower/central/upper monotonicity and excluded-edge assertions in [`cascade.test.ts`](../tests/core/cascade.test.ts) | Verified |
| A07 | InterventionLab | Feasibility, Pareto frontier, robust upper bound, baseline, and exact reversal-threshold assertions in [`interventions.test.ts`](../tests/core/interventions.test.ts) | Verified |
| A08 | Observability Frontier | Decision-change probability, information value, acquisition-cost flip, and non-promotion assertions in [`observability.test.ts`](../tests/core/observability.test.ts) | Verified |
| A09 | CascadeBench | Frozen cutoff, separated outcomes, metrics, and leakage rejection in [`benchmark.test.ts`](../tests/core/benchmark.test.ts) | Verified |
| A10 | RiskPack | Generation, exact file set, tamper detection, archive integrity, and relative checksums in [`riskpack.test.ts`](../tests/core/riskpack.test.ts), [`riskpack-archives.test.ts`](../tests/artifacts/riskpack-archives.test.ts), and [`verify-release.ts`](../scripts/verify-release.ts) | Verified |
| A11 | Ten core connectors | Exact adapter registry, synthetic contract fixtures, bounded network behavior, resumable pipeline, and license tests under [`tests/connectors`](../tests/connectors) | Verified |
| A12 | Twelve launch cases | Twelve classified, deterministic, scenario-only cases and complete RiskPacks in [`reference-cases.test.ts`](../tests/cases/reference-cases.test.ts) and [`validate-content.ts`](../scripts/validate-content.ts) | Verified |
| A13 | Data catalog and license safety | [`DATA_LICENSES.md`](DATA_LICENSES.md), [`connectors.json`](../content/catalog/connectors.json), and [`manifest.test.ts`](../tests/connectors/manifest.test.ts) | Verified |
| A14 | Web overview | Route/content/status assertions in [`rendered-html.test.mjs`](../tests/rendered-html.test.mjs) | Verified |
| A15 | WorldGraph explorer | Semantic observed/inferred controls, selection interaction, keyboard/mobile browser QA recorded in [`SELF_REVIEW_2026-08-13.md`](SELF_REVIEW_2026-08-13.md) | Verified |
| A16 | Scenario workbench | Recompute/share interaction plus complete export contract in [`workbench-export.test.ts`](../tests/web/workbench-export.test.ts) and the [self-review](SELF_REVIEW_2026-08-13.md) | Verified |
| A17 | Case, benchmark, data and method routes | Nine route categories, dynamic-case rendering, navigation, and download assertions in [`rendered-html.test.mjs`](../tests/rendered-html.test.mjs) | Verified |
| A18 | CLI and TypeScript SDK | [`cli.test.ts`](../tests/cli/cli.test.ts), [`analyze-reference-case.ts`](../examples/typescript/analyze-reference-case.ts), and fresh-archive example commands | Verified |
| A19 | Accessibility | Automated serious-impact audit, focus/reduced-motion assertions in [`accessibility.test.mjs`](../tests/accessibility.test.mjs), plus desktop/mobile keyboard QA | Verified |
| A20 | Security and untrusted-input limits | Repository secret scan, headers, dependency audit, bounded I/O/network, traversal and archive checks in [`check-security.ts`](../scripts/check-security.ts) and security-focused tests | Verified |
| A21 | Performance | Enforced client and 20,000-node budgets in [`check-performance.ts`](../scripts/check-performance.ts) and measured results in the [self-review](SELF_REVIEW_2026-08-13.md) | Verified |
| A22 | Documentation and contribution path | [`README.md`](../README.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), [`CLI.md`](CLI.md), [`SDK.md`](SDK.md), [`EXTENDING.md`](EXTENDING.md), and [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Verified |
| A23 | Release archive | [`prepare-release.ts`](../scripts/prepare-release.ts), deterministic CycloneDX assertions in [`sbom.test.ts`](../tests/release/sbom.test.ts), and detached `release/v0.1.0/release-manifest.json` plus `checksums.sha256` | Verified |
| A24 | Fresh archive reproducibility | [`verify-release.ts`](../scripts/verify-release.ts) and detached `release/v0.1.0/verification-report.json` prove clean install, regeneration, and full CI without `.git` | Verified |
| A25 | Public hosting | Hosting identity in [`.openai/hosting.json`](../.openai/hosting.json), exact release procedure in [`RELEASE_PROCESS.md`](RELEASE_PROCESS.md), and reopened public URL receipt in the [self-review](SELF_REVIEW_2026-08-13.md) | Verified |
| A26 | Documented self-review cycles | Dated issue/fix/rerun ledger with no unresolved P1/P2/P3 in [`SELF_REVIEW_2026-08-13.md`](SELF_REVIEW_2026-08-13.md) | Verified |

## Scoring rule

The repository may be described as release-complete only when A01–A26 are all proven. A self-assigned score is not evidence; each score must be derived from the matrix and current artifacts. Detached release receipts are generated from the immutable tag so they can record post-tag installation and deployment without changing the tagged source tree.
