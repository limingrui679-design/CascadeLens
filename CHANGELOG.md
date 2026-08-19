# Changelog

All notable release changes are recorded here. CascadeLens follows Semantic Versioning while pre-1.0 interfaces may evolve under the compatibility policy in `docs/SCHEMA_COMPATIBILITY.md`.

## Unreleased

No unreleased changes.

## 0.6.0 — 2026-08-20

### Decision-oriented case system

- Expanded the executable library from 12 to 16 cases without removing any prior
  case, adding health-data interoperability, behavioral-intervention evidence,
  place-based regeneration equity, and portfolio-concentration fiduciary stress.
- Added one shared 15-capability taxonomy and a decision profile for every case,
  covering the decision owner, stakeholders, methods, user tasks, trade-offs,
  and a domain-specific guardrail.
- Generated the case catalog, public capability matrix, and Workbench bundle
  from the same reviewed specifications, with validation that rejects drift
  among those surfaces.

### Robustness and communication

- Added a 25-run normalized-severity by transmission sensitivity surface to the
  browser Workbench.
- Added a downloadable Markdown decision brief carrying the graph digest,
  lower/central/upper bounds, stakeholder context, trade-offs, and explicit
  `scenario_only` and `evidence_required` boundaries.
- Reworked the case library, benchmark page, README, and documentation to make
  capability coverage and the exact path for changing each external-evidence
  count visible without converting internal software evidence into validation.

### Evidence boundary

All 16 cases remain `scenario_only`. This release adds no historically scored
case, external method or domain review, structured user study, verified
organizational adoption, or demonstrated real-world impact; all five counts
remain zero until a qualifying public record passes the machine gate.

## 0.5.1 — 2026-08-14

### Clearer public workflow

- Added a compact decision-to-RiskPack overview to the public README and moved
  the complete decision and verification graph into an expandable technical
  section, preserving the full evidence path without dominating the page.
- Updated the active Python install paths, package metadata, website copy,
  evidence-status page, issue prompts, citation metadata, and generated SBOM to
  the reviewed patch release.
- Updated the pinned CodeQL action to the reviewed `v4.37.7` tag commit.

### Evidence boundary

This patch changes presentation and release identity only. It adds no
historically scored case, external validation, structured user study, verified
organizational adoption, or demonstrated real-world impact. The 12 reference
cases remain `scenario_only`.

## 0.5.0 — 2026-08-14

### Published relational graph evidence

- Added a bounded U.S. BEA Input-Output connector and a frozen 2023 sector direct-requirements workbook under the recorded U.S. Government public-domain basis.
- Added a hardened XLSX reader with archive budgets, safe relationships, duplicate-entry and nested-archive rejection, and formula, error-cell, matrix-shape, identity, and coefficient validation.
- Normalized 225 published commodity-by-industry coefficients and preserved 222 positive values as sector-level `inputs_to` edges.
- Kept every BEA edge `MODEL_INFERRED`, ineligible for primary estimates, and available only in the upper evidence bound; no edge is represented as a firm-level supplier link or causal effect.
- Extended frozen-snapshot verification to rerun every normalizer from exact payload bytes and deterministically remap all four public snapshots.

### Evidence acceptance path

- Added a machine-validated evidence ledger whose five public counts are derived only from accepted, hashed records.
- Added ready-to-run historical replay, independent review, structured user-study, adoption, and impact protocols plus intake forms.
- Registered the protocols as hashed readiness artifacts that explicitly do not increment evidence counts.

### Evidence boundary

This release adds official sector-level relational data and an enforceable path for later validation. It still contains 0 historically scored cases, 0 external method or domain reviews, 0 structured user studies, 0 verified organizational adoptions, and 0 demonstrated real-world impacts. All 12 reference cases remain `scenario_only`.

## 0.4.0 — 2026-08-14

### Python-first user path

- Added an installable Python 3.11+ package with a dependency-free base, public API, and `cascadelens` CLI.
- Added one-command demonstration and recomputation-verifiable Python RiskPack creation.
- Added JSON, edge-list CSV, GraphML, and NetworkX imports; imported topology remains user-provided `MODEL_INFERRED` evidence.
- Made imports reject duplicate nodes, non-finite or out-of-range weights, inconsistent uncertainty bounds, and GraphML entity declarations; undirected GraphML and NetworkX edges expand explicitly in both directions.
- Added Python parity tests across all 12 reviewed cases, with lower, central, upper, and intervention outputs matched to the published browser artifacts to numerical tolerance.
- Added a Jupyter notebook, checked examples, three tutorials, and formal equations, baseline relationships, and failure conditions.
- Restricted `--overwrite` so JSON output never follows a symbolic link and a directory is replaced only when it is already a verified current RiskPack.

### Product and community

- Expanded the public workbench from one fixed case to all 12 reviewed cases.
- Added local browser imports for JSON, CSV, GraphML, and JSON/YAML ShockScript, with no file upload to the hosted service.
- Added a contextual GitHub source/star link after successful analysis or export.
- Added a 15-minute contribution path plus historical-replay and external-review submission templates.
- Added a public adoption and validation ledger that remains at zero until its evidence gates are satisfied.
- Bound release manifests to Python package metadata and made detached no-`.git` verification rerun the Python tests, demo, and RiskPack recomputation.

### Evidence boundary

Python/browser parity, local import support, packaging, tutorials, and repository settings are software and usability improvements. This release still contains 0 historically scored cases, 0 external validations, 0 verified organizational adoptions, and 0 demonstrated real-world impacts.

## 0.3.2 — 2026-08-13

### Release integrity

- Enabled repository-level immutable releases and used the draft-first publication workflow so the published tag, commit binding, release assets, and GitHub release attestation cannot be replaced after publication.

### Evidence boundary

This patch adds release immutability only. It does not add historical outcome scoring, external validation, organizational adoption, or demonstrated real-world impact.

## 0.3.1 — 2026-08-13

### Fixed

- Production builds now remove `dist`, `.next`, and `.vinext` before compilation, so a release digest cannot include stale files left by an earlier checkout or build configuration.
- The two-build verifier seeds a stale-output sentinel and fails unless the real production command removes it; detached verification now reports expected and actual build digests on mismatch.

### Evidence boundary

This patch strengthens release reproducibility only. It does not add historical outcome scoring, external validation, organizational adoption, or demonstrated real-world impact.

## 0.3.0 — 2026-08-13

### Closed audit findings

- Added strict runtime and published JSON schemas for assumption registers, model cards, and RiskPack limitations.
- Bound every assumption to a concrete scenario, graph-edge, or observation-candidate parameter; bound the assumption register to an exact-byte packaged source; and enforced model-card status, limitations, and benchmark consistency.
- Added self-consistently rehashed adversarial tests for false validation status, removed limitations, altered assumption values, and altered assumption-source digests.
- Expanded all ten adapter fixtures to three distinct records and added multiple permutations, field-order changes, duplicate-key, and exact-duplicate regressions.
- Replaced remote build-time fonts with repository-local Geist assets and added an enforced no-network production build.
- Made the complete production `dist` tree byte-reproducible across two clean builds, recorded its digest in the release manifest, and required exact reproduction in detached no-Git verification and Linux/macOS CI.
- Removed `unsafe-inline` from style CSP, applied per-response nonces to server-rendered styles, and blocked inline style attributes.

### Evidence boundary

This release closes the independently reproduced software findings. It still contains 0 historically scored cases, 0 external validations, 0 independent domain or security certifications, and 0 claims of organizational adoption or demonstrated real-world impact.

## 0.2.1 — 2026-08-13

### Fixed

- The detached verifier now accepts parentheses in otherwise bounded relative archive paths, matching the official FAOSTAT filename bundled in the frozen snapshot.
- Traversal, absolute paths, backslashes, shell metacharacters, duplicate entries, excessive expansion, high compression ratios, and nested archives remain rejected and regression-tested.

### Evidence boundary

This patch corrects release verification only. It does not add a historical outcome score, external validation, organizational adoption, or demonstrated real-world impact.

## 0.2.0 — 2026-08-13

### Corrected analytical semantics

- RiskPack verification now recomputes cascade, intervention, observability, and benchmark outputs from packaged inputs; self-consistently rehashed derived tampering fails with `derived_output_mismatch`.
- Added an optional externally retained pack digest without confusing publisher binding with deterministic recomputation.
- Replaced locale-sensitive canonical sorting with explicit UTF-8 byte ordering and added a four-locale Unicode golden test.
- Closed CascadeBench outcome timing by binding observations to a declared metric, horizon, complete outcome window, and post-window availability.
- Made intervention effects activate only after their declared lead time and report horizon-specific frontiers and recommendations.
- Refreshes bitemporal graph visibility through every simulated day and separates daily fixed-point solver iterations from simulated days.
- Solves acyclic visible graphs exactly in one topological pass, reuses only identical daily activation/topology states, and reserves bounded iteration for cyclic graphs, avoiding repeated multi-horizon and unchanged-day work.

### Strengthened data and case contracts

- Added resumable remote acquisition through the CLI: fetch, hash, verify, normalize, stabilize IDs, and conservatively map metric nodes into a WorldGraph snapshot.
- Split event-valid, published, available, retrieved, and observed times; made all ten adapter identities invariant to upstream row order.
- Revalidates raw, manifest, normalized, and graph artifacts before checkpoint resume; missing or corrupt state is fetched again.
- Added bounded FAOSTAT CSV/ZIP support with path, entry, size, ratio, ambiguity, and nested-archive rejection.
- Added three lawfully redistributable frozen official-source runs—FAOSTAT, GLEIF, and openFDA—with 3,802 normalized facts, exact-byte receipts, deterministic remapping checks, and zero inferred dependency edges.
- Corrected the openFDA Drug Shortages endpoint contract and enforced the publisher's 100-record request ceiling.
- Diversified the twelve scenario-only cases across chain, branch/merge, cycle, dynamic-activation, and dynamic-expiry topologies plus four horizon profiles.

### Assurance and publication

- Added pre-extraction release archive expansion, compression-ratio, and nested-archive budgets.
- Added a per-response script nonce and removed `unsafe-inline` from `script-src`.
- Added `/build-info.json` with commit, dirty state, version, lock/content/RiskPack catalog digests, build time, and an explicit self-attestation boundary.
- Updated the dependency inventory, removed the deprecated JSDOM transitive chain, and retained a zero-vulnerability dependency audit.
- Rebuilt the repository landing page, documentation indexes, contribution templates, and current action versions.

### Evidence boundary

This release closes software-verification findings. It still contains 0 historically scored cases, 0 external validations, and 0 claims of organizational adoption or demonstrated real-world impact.

## 0.1.1 — 2026-08-13

### Fixed

- Replay scoring now blocks unknown outcome nodes, duplicate node observations, and malformed outcome timestamps instead of silently dropping, double-weighting, or throwing on them.
- Public responses now add same-origin resource isolation and a two-year HTTPS transport policy.

### Improved

- Accessibility regression coverage now audits every reference-case page and fails on every detectable impact level, while retaining explicit exclusions only for checks that JSDOM cannot evaluate reliably.
- Rendered-route coverage now proves that unknown product and case URLs return a branded, non-leaking 404 response.

### Evidence boundary

This patch strengthens validation and release assurance. It does not add historical outcome scores, external model validation, organizational adoption, or demonstrated real-world impact.

## 0.1.0 — 2026-08-13

### Added

- Evidence-graded, bitemporal WorldGraph with canonical content-addressed snapshots.
- Versioned ShockScript validation and daily, multi-horizon lower/central/upper cascade analysis.
- Costed intervention enumeration, explicit do-not-act baseline, Pareto frontier, and observability value analysis.
- Frozen-cutoff replay scoring with leakage gates and honest scenario-only fallback.
- Complete checksummed RiskPack generation and verification.
- Ten bounded official/public-source connector contracts and twelve executable cross-domain scenario cases.
- TypeScript SDK, CLI, multi-route web product, accessibility checks, performance gates, security checks, SBOM, and reproducible release tooling.

### Evidence boundary

This release has software-verification evidence but no historical outcome score, external model validation, organizational adoption, or demonstrated real-world impact.
