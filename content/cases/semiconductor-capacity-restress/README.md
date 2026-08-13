# Semiconductor capacity re-stress

Status: **scenario_only**  
Classification: **quasi_historical**  
Decision cutoff: **2026-08-12T00:00:00Z**

A forward-dated semiconductor capacity stress across assumed fabrication, component, assembly, and production dependencies.

## Decision question

How do inventory, supplier diversification, and allocation compare under bounded chip-capacity loss?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Results from Semiconductor Supply Chain Request for Information](https://www.commerce.gov/news/blog/2022/01/results-semiconductor-supply-chain-request-information)
- Publisher: U.S. Department of Commerce
- Snapshot digest: `b2d0526b8cd42432281ce69af3b5d306048150ef5308a740debc775e4e8f2135`
- Lower / central / upper total impact: 0.039677 / 0.039677 / 0.103607
- Recommendation status: `evidence_required`

## Rebuild and verify

```bash
npm run cascadelens -- cases build semiconductor-capacity-restress
npm run cascadelens -- verify content/cases/semiconductor-capacity-restress/riskpack
```

## Limitations

The case does not estimate any company, facility, or sector's actual production loss.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
