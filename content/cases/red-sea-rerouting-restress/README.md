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
- Snapshot digest: `9ae78f43fd6dea6c8106d7792a7dfba46d80190b5db5cc4e0f95783640fbff19`
- Lower / central / upper total impact: 0.049755 / 0.049755 / 0.112780
- Recommendation status: `evidence_required`

## Decision profile

- Decision owner: Global logistics risk lead
- Stakeholders: ship operators; cargo owners; production sites; delivery recipients
- Capabilities exercised: system-mapping; temporal-reasoning; sensitivity-analysis; stakeholder-communication; uncertainty-bounds; resilience-operations
- Methods: dynamic edge expiry; upper-bound stress comparison; lead-time analysis

### User tasks

- compare routing and inventory assumptions
- locate the effect of an expiring link
- set a review trigger for changing course

### Trade-offs and guardrail

- route continuity versus longer transit
- faster action versus uncertain intervention effect

> No freight-rate, emissions, insurance, or realized delivery-time effect is claimed.

## Rebuild and verify

```bash
npm run cascadelens -- cases build red-sea-rerouting-restress
npm run cascadelens -- verify content/cases/red-sea-rerouting-restress/riskpack
```

## Limitations

The case does not claim actual freight-rate, emissions, or delivery-time effects.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
