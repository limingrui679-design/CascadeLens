# Place-based regeneration and equity stress

Status: **scenario_only**  
Classification: **synthetic_stress**  
Decision cutoff: **2026-08-12T00:00:00Z**

A synthetic place-based transition stress linking redevelopment, affordable housing, service access, local businesses, and resident continuity.

## Decision question

Which phased, budget-constrained package protects access and resident continuity while preserving redevelopment capacity?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Choice Neighborhoods](https://www.hud.gov/program_offices/public_indian_housing/programs/ph/cn/grants)
- Publisher: U.S. Department of Housing and Urban Development
- Snapshot digest: `38d88466a6e8dc8a6900bd6b34c0d41377769504def5a01918303663716d5ad2`
- Lower / central / upper total impact: 0.005410 / 0.005410 / 0.020848
- Recommendation status: `evidence_required`

## Decision profile

- Decision owner: Place-based regeneration planner
- Stakeholders: current residents; housing providers; local businesses; transport agencies; local government
- Capabilities exercised: spatial-policy; public-interest-ethics; constrained-optimization; temporal-reasoning; stakeholder-communication; system-mapping
- Methods: place-based dependency mapping; phased intervention analysis; distributional decision framing

### User tasks

- compare housing, access, and local-business safeguards
- state who benefits and who bears transition costs
- set a review trigger for displacement pressure

### Trade-offs and guardrail

- redevelopment pace versus resident continuity
- capital delivery versus affordable access

> The case represents no named neighborhood, parcel, household, grant, or measured displacement effect.

## Rebuild and verify

```bash
npm run cascadelens -- cases build place-based-regeneration-equity-stress
npm run cascadelens -- verify content/cases/place-based-regeneration-equity-stress/riskpack
```

## Limitations

No named neighborhood, parcel, household, funding decision, spatial estimate, or displacement outcome is represented.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
