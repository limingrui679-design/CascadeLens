# Portfolio concentration and fiduciary stress

Status: **scenario_only**  
Classification: **synthetic_stress**  
Decision cutoff: **2026-08-12T00:00:00Z**

A synthetic portfolio stress linking concentrated exposure, liquidity needs, mandate constraints, and beneficiary objectives without using holdings or returns.

## Decision question

Which rebalancing and liquidity safeguard remains feasible when a concentrated exposure is stressed under mandate constraints?

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in `assumptions.json` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [Beginner's guide to asset allocation, diversification, and rebalancing](https://www.investor.gov/sites/investorgov/files/2019-02/Beginners-Guide-to-Asset-Allocation.pdf)
- Publisher: U.S. Securities and Exchange Commission, Investor.gov
- Snapshot digest: `aaf910ca0bf40b88ed29a2d4a7ba14cf7b757c85caea0c1f5ff1faf9c453db55`
- Lower / central / upper total impact: 0.048071 / 0.048071 / 0.135346
- Recommendation status: `evidence_required`

## Decision profile

- Decision owner: Portfolio risk committee
- Stakeholders: beneficiaries; portfolio managers; risk teams; compliance officers; oversight committees
- Capabilities exercised: financial-risk; uncertainty-bounds; constrained-optimization; sensitivity-analysis; evidence-governance; stakeholder-communication
- Methods: concentration-shock mapping; liquidity and mandate constraints; rebalancing frontier

### User tasks

- compare rebalancing, liquidity buffer, and exposure review
- test sensitivity to stress transmission
- state the fiduciary and evidence limits of the output

### Trade-offs and guardrail

- concentration risk versus mandate tracking
- liquidity protection versus opportunity cost

> The case contains no real portfolio, security recommendation, return forecast, or evidence of fiduciary suitability.

## Rebuild and verify

```bash
npm run cascadelens -- cases build portfolio-concentration-fiduciary-stress
npm run cascadelens -- verify content/cases/portfolio-concentration-fiduciary-stress/riskpack
```

## Limitations

No real portfolio, security, price, return, investor preference, or suitability determination is represented.

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
