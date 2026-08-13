# Medical PPE demand re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated demand surge across an assumed personal-protective-equipment supply and care-delivery topology.

## Decision question

Which feasible supply intervention best limits bounded access disruption during a PPE demand surge?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Shortage of personal protective equipment endangering health workers worldwide](https://www.who.int/news/item/03-03-2020-shortage-of-personal-protective-equipment-endangering-health-workers-worldwide)
- Publisher: World Health Organization
- Snapshot digest: `5304e5991fdda394a1f716c334b2c1a25a933c5efae965f9fd983c2ae88b8cb5`
- Lower / central / upper total impact: 0.044558 / 0.044558 / 0.172375
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build medical-ppe-demand-restress
npm run cascadelens -- verify content/cases/medical-ppe-demand-restress/riskpack
```

## Limitations

The case is not a clinical model, shortage forecast, or emergency-response recommendation.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
