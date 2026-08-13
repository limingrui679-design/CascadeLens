# Changelog

All notable release changes are recorded here. CascadeLens follows Semantic Versioning while pre-1.0 interfaces may evolve under the compatibility policy in `docs/SCHEMA_COMPATIBILITY.md`.

## Unreleased

### Documentation

- Rebuilt the repository landing page around real product screenshots, a runnable entry path, an architecture diagram, explicit evidence boundaries, and role-based documentation navigation.
- Added focused indexes for documentation, package boundaries, content provenance, and checked examples.
- Added automated checks for local documentation targets, required project boundaries, and committed screenshot integrity.

### Community

- Added a structured feature-proposal form, private-security routing, and a fuller pull-request evidence checklist.

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
