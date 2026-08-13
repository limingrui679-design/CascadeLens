# Checked examples

The examples are executable parts of the repository verification path, not illustrative snippets that are allowed to drift.

## TypeScript SDK

[`typescript/analyze-reference-case.ts`](typescript/analyze-reference-case.ts) loads the Suez reference graph and ShockScript, runs the offline SDK pipeline, checks the expected `scenario_only` benchmark status, and verifies the published RiskPack.

```bash
npm ci
npm run example:sdk
```

Expected output identifies the case, snapshot digest, bounded impact, intervention count, benchmark status, and RiskPack verification result. A successful example proves the checked software path and artifact integrity; it does not prove empirical accuracy.

For other interfaces, see the [CLI guide](../docs/CLI.md), [SDK guide](../docs/SDK.md), and [live product](https://cascadelens.limingrui2.chatgpt.site).
