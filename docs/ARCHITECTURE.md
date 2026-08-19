# Architecture

CascadeLens uses a canonical Python analysis package and a TypeScript browser-compatibility layer for the hosted demonstration.

```text
official/public sources
        |
        v
connectors -- source snapshots -- license gate
        |
        v
Python WorldGraph normalization -- canonical snapshot hash
        |
        +-- ShockScript compiler
        +-- cascade and missing-graph bounds
        +-- InterventionLab
        +-- Observability Frontier
        +-- CascadeBench scoring
        |
        v
RiskPack -- Python CLI / API
        |
        +-- reviewed artifacts --> TypeScript web product
```

## Design choices

- **Python-first core:** `src/cascadelens` owns user graph import, contract validation, cascade execution, intervention analysis, benchmark gating, and RiskPack recomputation.
- **Cross-runtime parity:** Python executes all 16 reviewed cases and matches the browser artifacts to numerical tolerance; the TypeScript layer remains for website interaction and content-release compatibility.
- **Single generated case surface:** one case specification emits the per-case artifacts, catalog record, capability matrix, Workbench bundle, and RiskPack. The web product no longer maintains a hand-written import list.
- **Deterministic core:** canonical keys and identifiers use explicit UTF-8 byte order, so equal input snapshots, scripts, and engine versions produce stable canonical JSON in the tested runtime matrix.
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

- `src/cascadelens`: primary Python package, CLI, imports, engine, analysis, and RiskPack.
- `tests_python`: Python reference parity, import, CLI, and adversarial RiskPack tests.
- `packages/core`: TypeScript browser-compatibility engine for the hosted product.
- `packages/connectors`: TypeScript source acquisition retained for the reviewed frozen runs.
- `packages/cli`: hosted-content and release-maintainer compatibility commands.
- `content`: versioned source records, scenarios, reviewed outputs, and narrative metadata.
- `app`: public UI. It consumes reviewed artifacts and the browser compatibility engine.
- `scripts`: content validation, release, packaging, and reproducibility tools.
- `tests`: unit, integration, content, render, security, and release verification.

The Python package is the recommended user entry point. The TypeScript tree remains visible and tested; GitHub language statistics exclude it because it is the hosted demonstration rather than the primary local product.
