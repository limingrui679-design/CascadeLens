# Adoption and validation status

Current status for release `v0.6.0`:

| Evidence | Count | What would change it |
|---|---:|---|
| Historically scored cases | 0 | A frozen-cutoff, outcome-separated replay passing the registered protocol |
| External method or domain reviews | 0 | A named independent reviewer record with scope, conflicts, commit, method, and findings |
| Structured usability studies | 0 | Consented participants, predefined tasks, full outcomes, and failures |
| Verified organizational adoption | 0 | Identifiable counterparty, scope, dates, task evidence, and permission to publish |
| Demonstrated real-world impact | 0 | Counterfactual or otherwise defensible evidence beyond software use |

The Python package, public website, GitHub stars, clones, page views, internal tests, deterministic parity, and RiskPack verification do not increase these counts.

## Open evidence paths

- [Historical replay proposal](https://github.com/limingrui679-design/CascadeLens/issues/new?template=historical-replay.yml)
- [External review record](https://github.com/limingrui679-design/CascadeLens/issues/new?template=external-review.yml)
- [External validation protocol](EXTERNAL_VALIDATION_PROTOCOL.md)
- [Ready-to-run validation packets](validation/README.md)
- [Machine evidence ledger](../content/validation/evidence-ledger.json)
- [Methods and failure conditions](METHODS.md)

The counts are now derived from accepted JSON records by `npm run validate:evidence`. Protocols and issue forms are hashed readiness artifacts but cannot increment a count. A count changes only after a public, stable artifact passes the common and category-specific claim-to-evidence gates.
