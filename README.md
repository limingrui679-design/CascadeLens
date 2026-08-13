# CascadeLens

CascadeLens is an evidence-graded, bitemporal world graph and executable shock-analysis platform for global supply-chain, financial, and critical-goods resilience.

It is designed around a hard boundary: observed relationships, entity reports, verified third-party records, text extractions, and model inferences are different kinds of evidence and must remain different in every result.

> Current release: `v0.1.1`. This is a software-verified research release, not an empirically validated production decision system.

[Open the public product](https://cascadelens.limingrui2.chatgpt.site) · [Inspect the release process](docs/RELEASE_PROCESS.md) · [Read the v0.1.1 five-pass review](docs/SELF_REVIEW_2026-08-13_v0.1.1.md)

## Quick start

```bash
npm ci
npm run generate:catalog
npm run generate:cases
npm run example:sdk
npm run dev
npm run ci
```

## Product architecture

- `packages/core`: WorldGraph, ShockScript, cascade engines, intervention analysis, benchmark, and RiskPack.
- `packages/connectors`: official-source acquisition and normalization.
- `packages/cli`: validation, execution, packaging, and verification commands.
- `packages/sdk`: typed public exports and an offline analysis helper.
- `content`: reviewed source manifests, scenario definitions, and generated results.
- `app`: public multi-route product.
- `docs/PRODUCT_REQUIREMENTS.md`: normative product requirements.
- `docs/ACCEPTANCE_MATRIX.md`: requirement-by-requirement completion ledger.

## Commands

- `npm run dev`: run the local web product.
- `npm run ci`: lint, type-check, validate content, test, and build.
- `npm run test:performance`: enforce client budgets and a 20,000-node research-scale smoke profile.
- `npm run test:security`: audit dependencies, repository secrets, public paths, and response headers.
- `npm run cascadelens -- validate <scenario>`: validate a ShockScript.
- `npm run cascadelens -- run <scenario>`: run a scenario and write a RiskPack.
- `npm run cascadelens -- verify <riskpack>`: independently verify a RiskPack.

See the [CLI guide](docs/CLI.md), [TypeScript SDK guide](docs/SDK.md), [extension guide](docs/EXTENDING.md), and [schema compatibility policy](docs/SCHEMA_COMPATIBILITY.md).

## Current verified scope

- 10 official/public-source connector contracts with explicit acquisition and license modes.
- 12 executable cross-domain reference cases, each with a complete verified RiskPack.
- 0 historically scored cases, 0 external validations, and 0 claims of organizational adoption.
- Daily propagation with separately reported time-weighted mean, peak, and final-day impacts across every declared horizon.

The reference cases verify the software and evidence-governance workflow. Their topology and numeric parameters are declared assumptions, so they do not establish real-world predictive accuracy.

## Evidence boundaries

- Public-data examples are not client projects.
- Historical replay scores are not deployment or adoption.
- Simulated impacts are not causal estimates or realized losses.
- The platform is not investment, legal, sanctions-compliance, clinical, or emergency-response advice.

See the [product requirements](docs/PRODUCT_REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [security policy](SECURITY.md), and [contribution guide](CONTRIBUTING.md).
