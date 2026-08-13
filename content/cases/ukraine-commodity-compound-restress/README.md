# Food, fertilizer, and energy compound re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A compound forward stress joining assumed food, fertilizer, energy, logistics, and affordability dependencies.

## Decision question

Which combination of buffers and substitution remains robust when several commodity channels move together?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Food and Energy Price Shocks from Ukraine War](https://www.worldbank.org/en/news/press-release/2022/04/26/food-and-energy-price-shocks-from-ukraine-war)
- Publisher: World Bank
- Snapshot digest: `ce43269c1f0bf261f7dc3e7015be7bec91ae934071a1e30db12a390b14f5020e`
- Lower / central / upper total impact: 0.064444 / 0.064444 / 0.134217
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build ukraine-commodity-compound-restress
npm run cascadelens -- verify content/cases/ukraine-commodity-compound-restress/riskpack
```

## Limitations

No country-level price, hunger, or welfare effect is estimated.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
