# Critical-minerals export-control stress

Status: **scenario_only**  
Classification: **synthetic_stress**  
Decision cutoff: **2026-08-12T00:00:00Z**

A synthetic export-control stress across an assumed mineral, component, manufacturing, and infrastructure chain.

## Decision question

What is the value of diversification and additional evidence under a concentrated critical-mineral dependency?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [2026 IEA Ministerial Declaration supporting critical-minerals security](https://www.iea.org/news/2026-iea-ministerial-declaration-supporting-the-iea-s-work-on-critical-minerals-security)
- Publisher: International Energy Agency
- Snapshot digest: `db6bc9e6ad54a2c42e14d431fd31a544633b84fb46a8a45f284d12831dee6814`
- Lower / central / upper total impact: 0.043858 / 0.043858 / 0.134873
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build critical-minerals-export-stress
npm run cascadelens -- verify content/cases/critical-minerals-export-stress/riskpack
```

## Limitations

The synthetic topology does not represent a named mineral, country, firm, or actual export-control measure.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
