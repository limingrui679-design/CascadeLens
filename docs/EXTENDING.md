# Extending CascadeLens

## Add a cascade engine

Implement `CascadeEnginePlugin` from `packages/core/src/types.ts`, register the engine explicitly, and add deterministic tests for bounds, cycles, convergence, invalid input, and model versioning. Unknown engine identifiers fail closed.

An engine must preserve evidence grades, snapshot identity, scenario identity, output finiteness, and lower-to-upper monotonicity. If those invariants do not apply to a new method, document and version a separate result contract instead of weakening the existing contract.

## Add a connector

Implement `ConnectorAdapter` and add exactly one `ConnectorDescriptor` with official source, documentation, terms, acquisition mode, allowlisted hosts, rate limit, response limit, evidence grade, field mappings, and limitations. Use recorded fictional structure fixtures in tests; do not commit restricted source payloads.

Network acquisition must use the shared bounded fetch client. Redirects, non-HTTPS endpoints, unapproved hosts, header injection, unlimited retries, unbounded responses, silent license assumptions, and secrets in persisted URIs are prohibited.

## Add a replay or reference case

Every case declares one classification:

- `historical_replay`: all model inputs were publicly available by the frozen decision cutoff, with separately acquired post-cutoff outcomes.
- `quasi_historical`: a current forward stress inspired by a documented historical event; it is not a historical forecast.
- `synthetic_stress`: an explicit hypothetical stress without a claim about a specific historical event.

Each contribution needs an assumption register, sealed graph, ShockScript, model card, results, benchmark record, limitations, recomputation-verified RiskPack, rebuild command, and tests. Context citations cannot be used as quantitative evidence when the exact data artifact was not preserved and hashed.

## Pull-request gate

```bash
npm ci
npm run ci
```

The reviewer should also inspect evidence semantics and licensing; automated tests cannot determine whether a narrative overstates the source.
