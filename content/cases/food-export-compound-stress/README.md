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
- Snapshot digest: `ffee551974e9253b0dd765354b4e26f33feb12d7340002154d9780ead20cb8fa`
- Lower / central / upper total impact: 0.057330 / 0.057330 / 0.128441
- Recommendation status: `evidence_required`

## Decision profile

- Decision owner: Food-system policy planner
- Stakeholders: producers; traders; distributors; public agencies; households
- Capabilities exercised: system-mapping; constrained-optimization; public-interest-ethics; sensitivity-analysis; stakeholder-communication; resilience-operations
- Methods: compound supply-policy shock; Pareto frontier; affordability-oriented criticality

### User tasks

- compare reserves and import diversity
- test joint-shock assumptions
- identify which groups require separate outcome data

### Trade-offs and guardrail

- reserve release versus future resilience
- market continuity versus household affordability

> No current production, trade, price, nutrition, or food-security observation drives the scenario.

## Rebuild and verify

```bash
npm run cascadelens -- cases build food-export-compound-stress
npm run cascadelens -- verify content/cases/food-export-compound-stress/riskpack
```

## Limitations

No current production, trade, price, or food-security observation is included in the model topology.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
