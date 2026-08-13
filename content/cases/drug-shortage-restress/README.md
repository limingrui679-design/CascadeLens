# Drug-shortage re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated medicine-supply stress across assumed manufacturer, wholesaler, care-site, and treatment-access links.

## Decision question

Which bounded supply intervention remains feasible when a medicine becomes constrained?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [openFDA Drug Shortages API](https://open.fda.gov/apis/drug/drugshortages/)
- Publisher: U.S. Food and Drug Administration
- Snapshot digest: `ab195f3946b8fb9a4c9c89aaa02591676b70ad3a89a6a356038d40384e23a441`
- Lower / central / upper total impact: 0.066140 / 0.066140 / 0.169978
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build drug-shortage-restress
npm run cascadelens -- verify content/cases/drug-shortage-restress/riskpack
```

## Limitations

The case is not a clinical recommendation and uses no current shortage record as a factual input.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
