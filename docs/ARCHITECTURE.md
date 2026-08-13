# Architecture

CascadeLens uses a small, deterministic core and optional scale adapters.

```text
official/public sources
        |
        v
connectors -- source snapshots -- license gate
        |
        v
WorldGraph normalization -- canonical snapshot hash
        |
        +-- ShockScript compiler
        +-- cascade and missing-graph bounds
        +-- InterventionLab
        +-- Observability Frontier
        +-- CascadeBench scoring
        |
        v
RiskPack -- CLI / SDK / Web product
```

## Design choices

- **Deterministic core:** canonical keys and identifiers use explicit UTF-8 byte order, so equal input snapshots, scripts, and engine versions produce byte-stable canonical JSON across the tested locale matrix.
- **Portable local profile:** JSON-compatible artifacts and no required hosted database.
- **Serverless public product:** the web surface runs on Cloudflare-compatible ESM output and reads reviewed bundled results.
- **Node-side acquisition:** network connectors do not run in the browser and never expose credentials.
- **Conservative normalization:** the generic connector mapping preserves normalized facts as metric nodes and never invents dependency topology.
- **Temporal execution:** graph visibility is reevaluated on every event day. An intervention starts at the frozen decision cutoff and activates only at `decisionCutoff + leadTimeDays`; solver iterations are distinct from simulated days.
- **Semantically bound evidence packs:** RiskPack verification validates versioned metadata contracts, binds assumption bytes to the packaged source manifest and each value to its actual scenario, graph, or observation parameter, checks model-card/benchmark and mandatory-limitation consistency, and rebuilds all derived outputs. An optional external digest binds the whole pack to a separately retained receipt.
- **Byte-reproducible web build:** production fonts are repository-local; an offline build guard blocks non-loopback network access; build-scoped framework entropy is deterministically derived from source identity; and two fresh builds must have the same complete `dist` tree digest.
- **Inspectable deployment:** `/build-info.json` exposes commit, Git tree, exact tag when present, dirty state, version, lock digest, content-catalog digest, RiskPack-catalog digest, build time, and hosting project id with an explicit self-attestation boundary.
- **Optional scale layer:** large datasets remain in user-managed object storage and are represented by content-addressed manifests.
- **Failure closed:** unsupported evidence, invalid temporal state, contradictory metadata, unverified license, or infeasible optimization blocks stronger output.

## Package boundaries

- `packages/core`: domain model, validation, canonicalization, engines, benchmark, and RiskPack.
- `packages/connectors`: source-specific acquisition and normalization.
- `packages/cli`: user-facing command line.
- `content`: versioned source records, scenarios, reviewed outputs, and narrative metadata.
- `app`: public product UI. It consumes reviewed core outputs and does not independently invent analytics.
- `scripts`: content validation, release, packaging, and reproducibility tools.
- `tests`: unit, integration, content, render, security, and release verification.
