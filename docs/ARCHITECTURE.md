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

- **Deterministic core:** equal input snapshots, script, and engine version produce byte-stable canonical JSON results.
- **Portable local profile:** JSON-compatible artifacts and no required hosted database.
- **Serverless public product:** the web surface runs on Cloudflare-compatible ESM output and reads reviewed bundled results.
- **Node-side acquisition:** network connectors do not run in the browser and never expose credentials.
- **Optional scale layer:** large datasets remain in user-managed object storage and are represented by content-addressed manifests.
- **Failure closed:** unsupported evidence, invalid temporal state, unverified license, or infeasible optimization blocks stronger output.

## Package boundaries

- `packages/core`: domain model, validation, canonicalization, engines, benchmark, and RiskPack.
- `packages/connectors`: source-specific acquisition and normalization.
- `packages/cli`: user-facing command line.
- `content`: versioned source records, scenarios, reviewed outputs, and narrative metadata.
- `app`: public product UI. It consumes reviewed core outputs and does not independently invent analytics.
- `scripts`: content validation, release, packaging, and reproducibility tools.
- `tests`: unit, integration, content, render, security, and release verification.
