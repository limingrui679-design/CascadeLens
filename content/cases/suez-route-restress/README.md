# Suez route closure re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated re-stress of a Suez route interruption across a deliberately assumed maritime-to-production dependency chain.

## Decision question

Which bounded intervention remains feasible if the Suez route becomes unavailable for a short planning horizon?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Navigation in the Suez Canal restored after the Ever Given incident](https://www.suezcanal.gov.eg/English/MediaCenter/News/Pages/31-3-2021.aspx)
- Publisher: Suez Canal Authority
- Snapshot digest: `8c660225b5be7a35c2d6bdd132683eeda5a950f6763ecb96c23baf28e02225b2`
- Lower / central / upper total impact: 0.064444 / 0.064444 / 0.163606
- Recommendation status: `evidence_required`

## Decision profile

- Decision owner: Cross-border operations lead
- Stakeholders: carriers; procurement teams; production planners; downstream customers
- Capabilities exercised: system-mapping; uncertainty-bounds; constrained-optimization; temporal-reasoning; stakeholder-communication; resilience-operations
- Methods: bitemporal eligibility; missing-graph bounds; lead-time-constrained Pareto analysis

### User tasks

- compare buffer and rerouting bundles
- locate the dependency that drives the upper bound
- state the evidence needed before acting

### Trade-offs and guardrail

- speed versus normalized cost
- continuity versus reliance on assumed links

> Do not interpret the stress index as vessel delay, revenue loss, or a forecast of a closure.

## Rebuild and verify

```bash
npm run cascadelens -- cases build suez-route-restress
npm run cascadelens -- verify content/cases/suez-route-restress/riskpack
```

## Limitations

The topology and all dependency weights are research assumptions, not reconstructed 2021 trade flows.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
