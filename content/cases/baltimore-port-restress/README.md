# Baltimore port access re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated port-access interruption across assumed terminal, automotive logistics, manufacturing, and delivery links.

## Decision question

How do alternate ports and inventory buffers compare under a sudden port-access loss?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [NTSB opens public docket on Francis Scott Key Bridge investigation](https://www.ntsb.gov/news/press-releases/Pages/NR20240624.aspx)
- Publisher: National Transportation Safety Board
- Snapshot digest: `494dc935c4d0191b4de22790e7e19fbb33462aad60336f6551141a6c11e61abc`
- Lower / central / upper total impact: 0.069402 / 0.069402 / 0.179967
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build baltimore-port-restress
npm run cascadelens -- verify content/cases/baltimore-port-restress/riskpack
```

## Limitations

The case is not an engineering reconstruction or estimate of the 2024 incident's realized losses.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
