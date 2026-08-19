# Hurricane refining re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated refining-capacity interruption across assumed fuel, transport, distribution, and essential-service links.

## Decision question

Which reserve, rerouting, or demand-management bundle is feasible under bounded refining disruption?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Hurricane Ida caused widespread refinery and pipeline outages](https://www.eia.gov/todayinenergy/detail.php?id=49576)
- Publisher: U.S. Energy Information Administration
- Snapshot digest: `7b6e9543509665ac71eb6700a9d61f907d4eef4c02e8cdde1c73d8789aa2e824`
- Lower / central / upper total impact: 0.042455 / 0.042455 / 0.115757
- Recommendation status: `evidence_required`

## Decision profile

- Decision owner: Essential-services continuity lead
- Stakeholders: refiners; freight operators; public agencies; essential-service providers; residents
- Capabilities exercised: temporal-reasoning; constrained-optimization; public-interest-ethics; stakeholder-communication; uncertainty-bounds; resilience-operations
- Methods: capacity-shock compilation; criticality-weighted outcomes; reserve and rerouting frontier

### User tasks

- compare reserves, rerouting, and demand management
- test whether a bundle fits the lead-time window
- surface service-equity questions

### Trade-offs and guardrail

- commercial continuity versus essential-service priority
- reserve depletion versus immediate access

> The case is not a weather forecast or a fuel-market impact estimate.

## Rebuild and verify

```bash
npm run cascadelens -- cases build refining-hurricane-restress
npm run cascadelens -- verify content/cases/refining-hurricane-restress/riskpack
```

## Limitations

The case is not a weather forecast or estimate of realized fuel-market impacts.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
