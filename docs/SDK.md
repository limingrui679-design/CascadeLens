# TypeScript SDK

CascadeLens exports its strict domain types and deterministic analysis functions from `packages/sdk/src/index.ts`.

```ts
import {
  analyzeScenario,
  parseShockScript,
  verifySnapshot,
  type GraphSnapshot,
} from "cascadelens/sdk";
```

The local `analyzeScenario(snapshot, scenario, outcomes?)` helper returns cascade bounds, intervention analysis, and a benchmark result. If no separated post-event outcomes are supplied, the benchmark status is `scenario_only`.

Run the checked example:

```bash
npm run example:sdk
```

## Stable public schemas

- `schemas/worldgraph-0.1.0.schema.json`
- `schemas/shockscript-0.1.0.schema.json`
- `schemas/riskpack-manifest-0.1.0.schema.json`
- `schemas/assumption-register-1.0.0.schema.json`
- `schemas/model-card-1.0.0.schema.json`
- `schemas/riskpack-limitations-1.0.0.schema.json`

The current SDK rejects unknown ShockScript fields, unsupported schema versions, unsafe identifiers, invalid temporal ordering, outcome leakage, malformed or duplicate replay outcomes, unregistered engines, incompatible graph references, and RiskPack metadata that does not bind exactly to the packaged scenario, graph, benchmark, and assumptions source. WorldGraph, ShockScript, and RiskPack manifest schemas remain at version `0.1.0`; the three metadata contracts begin at version `1.0.0`.
