# Panama Canal drought re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated transit-capacity stress linking an assumed canal constraint to shipping, inventories, production, and service levels.

## Decision question

When does route diversification become preferable to inventory buffering under a canal-capacity constraint?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Panama Canal Authority adapts to unprecedented challenges](https://pancanal.com/en/panama-canal-authority-adapts-to-unprecedented-challenges/)
- Publisher: Panama Canal Authority
- Snapshot digest: `81a67e3b7e0d296b8425cd4638bf494127b6d8f4b0f4dc942e73cf6e61ca609a`
- Lower / central / upper total impact: 0.030299 / 0.030299 / 0.069050
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build panama-drought-restress
npm run cascadelens -- verify content/cases/panama-drought-restress/riskpack
```

## Limitations

The case does not reconstruct actual vessel queues, tolls, or shipment volumes.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
