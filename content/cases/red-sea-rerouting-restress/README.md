# Red Sea rerouting re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated shipping-route stress across assumed voyage-time, input, production, and delivery dependencies.

## Decision question

Which intervention minimizes upper-bound continuity loss when vessels avoid the Red Sea route?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Navigating troubled waters: Impact to global trade of disruption of shipping routes](https://unctad.org/publication/navigating-troubled-waters-impact-global-trade-disruption-shipping-routes-red-sea-black)
- Publisher: UN Trade and Development
- Snapshot digest: `c6d40d4d0005712d0173d3bc1ac37e8206b258430e4a6eb7a761660f946d8df8`
- Lower / central / upper total impact: 0.049755 / 0.049755 / 0.112780
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build red-sea-rerouting-restress
npm run cascadelens -- verify content/cases/red-sea-rerouting-restress/riskpack
```

## Limitations

The case does not claim actual freight-rate, emissions, or delivery-time effects.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
