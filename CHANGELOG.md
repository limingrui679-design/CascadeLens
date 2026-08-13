# Changelog

All notable release changes are recorded here. CascadeLens follows Semantic Versioning while pre-1.0 interfaces may evolve under the compatibility policy in `docs/SCHEMA_COMPATIBILITY.md`.

## Unreleased

No unreleased changes.

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
