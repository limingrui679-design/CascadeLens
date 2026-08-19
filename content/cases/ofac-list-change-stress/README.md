# Sanctions-list change stress

Status: **scenario_only**  
Classification: **synthetic_stress**  
Decision cutoff: **2026-08-12T00:00:00Z**

A synthetic operational stress exploring how a sanctions-list change could affect assumed screening, payment, supplier, and delivery dependencies.

## Decision question

Which operational safeguard limits disruption while preserving a fail-closed compliance boundary?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Sanctions List Service](https://ofac.treasury.gov/sanctions-list-service)
- Publisher: U.S. Department of the Treasury, Office of Foreign Assets Control
- Snapshot digest: `a91958bb1d0c493de98e748321bbacd6b4f2c460d71c721256b7ad6e58454b28`
- Lower / central / upper total impact: 0.056039 / 0.056039 / 0.131712
- Recommendation status: `evidence_required`

## Decision profile

- Decision owner: Financial-compliance operations lead
- Stakeholders: compliance reviewers; payment teams; suppliers; customers; legal counsel
- Capabilities exercised: data-systems; evidence-governance; financial-risk; constrained-optimization; stakeholder-communication; public-interest-ethics
- Methods: fail-closed policy stress; queue dependency mapping; manual-review option comparison

### User tasks

- preserve the compliance gate while comparing continuity options
- separate list data from a legal conclusion
- document escalation and review ownership

### Trade-offs and guardrail

- transaction continuity versus compliance safety
- automation speed versus accountable review

> The case performs no sanctions screening and makes no legal or eligibility determination.

## Rebuild and verify

```bash
npm run cascadelens -- cases build ofac-list-change-stress
npm run cascadelens -- verify content/cases/ofac-list-change-stress/riskpack
```

## Limitations

This is not sanctions screening, legal advice, or a determination that any party is restricted.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
