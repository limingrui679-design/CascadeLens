# CascadeLens product requirements

Status: normative  
Version: 0.1  
Last updated: 2026-08-13

CascadeLens is an evidence-graded, bitemporal world graph and executable shock-analysis platform for global supply-chain, financial, and critical-goods resilience. It must remain useful without proprietary data and must never present inferred relationships or simulated outcomes as observed facts.

## 1. Product invariants

1. Every real-world node and edge has a stable identifier.
2. Every evidence-bearing object records both when it was valid in the world and when it became observable to the system.
3. Every analytical input is linked to a source record with retrieval time, license status, and SHA-256 digest.
4. Official observations, entity reports, verified third-party records, text extractions, and model inferences remain distinct throughout ingestion, analysis, presentation, and export.
5. Model-inferred edges may not enter a primary point estimate.
6. Historical replays enforce `observedAt <= decisionCutoff` for all model inputs.
7. Post-event outcomes are stored in a separate scoring partition and cannot leak into replay inputs.
8. Simulated impacts are labelled as scenarios, not forecasts, causal effects, realized losses, or organizational outcomes.
9. Unsupported actions resolve to `blocked` or `evidence_required`; the product is allowed to stop.
10. All displayed material results must be reproducible from an exported RiskPack.

## 2. Required product surfaces

### R1 — WorldGraph

- Typed nodes and typed directed edges.
- Bitemporal querying by valid time and observation time.
- Source and license lineage.
- Evidence grade and confidence.
- Eligibility flags for primary estimates, bounded scenarios, and retrieval-only use.
- Canonical serialization and content-addressed snapshots.

### R2 — ShockScript

- Versioned YAML and JSON schema.
- One or more shocks per scenario.
- Targets may be nodes, edges, groups, regions, products, or routes.
- Capacity, supply, demand, cost, availability, policy, and financial-factor operations.
- Time horizon, propagation configuration, intervention candidates, objectives, and constraints.
- Deterministic validation with actionable error paths.

### R3 — Cascade engines

- Directed dependency propagation with cycle-safe convergence.
- Trade and material-flow conservation checks.
- Lower, central, and upper missing-graph bounds.
- Multiple simultaneous shocks.
- Pluggable engine interface.
- Explicit baselines and reversible parameterization.

### R4 — InterventionLab

- Costed interventions with eligibility, lead time, and capacity constraints.
- Robust evaluation across graph bounds and stress variants.
- Pareto frontier instead of a hidden single score.
- Feasibility checks and `do_not_act` baseline.
- Decision-reversal thresholds.

### R5 — Observability Frontier

- Candidate missing observations.
- Expected decision change and uncertainty reduction.
- Acquisition cost.
- Ranked value-of-information output.
- No claim that an inferred edge is true merely because it has high information value.

### R6 — CascadeBench

- Frozen decision cutoff.
- Input and outcome partitions.
- No-lookahead verifier.
- Direction, rank, interval coverage, calibration, feasibility, and regret metrics where appropriate.
- Scenario-only designation when real outcomes are unavailable or incomparable.

### R7 — RiskPack

- Source manifest and graph snapshot manifest.
- ShockScript, parameters, assumptions, model card, limitations, and results.
- Machine-readable checksums using relative paths.
- Rebuild and verify commands.
- Schema migration and compatibility policy.

### R8 — Connectors

- UN Comtrade, OECD ICIO, SEC EDGAR, GLEIF, FAOSTAT, openFDA, OFAC, WITS, UNCTAD LSCI, and optional facility/maritime adapters.
- Rate limiting, request identification, retries with bounded deadlines, response-size limits, and atomic snapshots.
- License modes: `redistributable`, `download_on_run`, and `user_provided`.
- Raw payload preservation where permitted and normalized output with field-level lineage.

### R9 — Historical and stress library

- Twelve domain-diverse launch cases.
- Every case declares `historical_replay`, `quasi_historical`, or `synthetic_stress`.
- Every historical replay uses official or methodologically documented public data.
- No school, admissions program, or application-specific labels in the public repository.

### R10 — Web product

- Public overview, WorldGraph explorer, scenario workbench, case library, data catalog, benchmark, methodology, and documentation surfaces.
- Keyboard, touch, reduced-motion, high-contrast, responsive, and screen-reader support.
- Product-specific first viewport; no generic dashboard placeholder.
- Clear observed/inferred/scenario visual semantics.
- Shareable scenario state and downloadable RiskPack.

### R11 — Developer product

- CLI for validating, running, packing, and verifying scenarios.
- Typed TypeScript SDK and stable schemas.
- Connector, engine, and replay contribution interfaces.
- Fresh-install quick start and deterministic examples.

### R12 — Release quality

- Strict type checking, linting, unit, integration, invariant, content, render, accessibility, and security checks.
- Fresh archive install and full verification without `.git`.
- Dependency audit, secret scan, path traversal checks, and untrusted-input limits.
- Reproducible release archive, relative checksum file, SBOM, citation, security policy, and data-license inventory.
- Public hosted site only after the exact release build passes.

## 3. Scale profiles

Scale profiles describe supported execution modes, not guaranteed bundled data volumes.

| Profile | Intended scope | Packaging rule |
|---|---|---|
| `local` | A complete case on a laptop | Includes small lawful snapshots and derived results |
| `research` | Tens to hundreds of millions of facts | Download-on-run data lake with partition manifests |
| `distributed` | Billion-scale temporal facts | User-managed object storage and compute adapters |

The public Git repository stores source code, schemas, source manifests, small lawful snapshots, and derived results. It does not mirror restricted or impractically large raw datasets.

## 4. Truthful status vocabulary

| Status | Meaning |
|---|---|
| `observed` | Directly present in a cited source snapshot |
| `entity_reported` | Disclosed by the represented entity |
| `third_party_verified` | Verified under a documented external method |
| `text_extracted` | Extracted candidate awaiting confirmation |
| `model_inferred` | Model output; not an observed relationship |
| `historically_scored` | Compared with a separated post-event outcome |
| `scenario_only` | A model scenario without valid real-outcome scoring |
| `externally_reviewed` | Reviewed by a named independent reviewer with a public or archived record |
| `deployed` | Running at an accessible URL or documented user environment |
| `adopted` | Used by identifiable real users under recorded scope |

No stronger status may be inferred from a weaker one.
