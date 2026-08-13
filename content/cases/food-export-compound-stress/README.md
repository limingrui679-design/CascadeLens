# Food production and export-restriction compound stress

Status: **scenario_only**  
Classification: **synthetic_stress**  
Decision cutoff: **2026-08-12T00:00:00Z**

A synthetic compound stress linking assumed production loss and export restriction to processing, trade, distribution, and affordability.

## Decision question

Which reserve and diversification choices stay on the Pareto frontier under a two-channel food stress?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [FAOSTAT data portal](https://www.fao.org/faostat/en/)
- Publisher: Food and Agriculture Organization of the United Nations
- Snapshot digest: `df5720b4e2ac543074f63723830e26987dd1fa2bbf0de87d4285ea9737bd3016`
- Lower / central / upper total impact: 0.057330 / 0.057330 / 0.129289
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build food-export-compound-stress
npm run cascadelens -- verify content/cases/food-export-compound-stress/riskpack
```

## Limitations

No current production, trade, price, or food-security observation is included in the model topology.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
