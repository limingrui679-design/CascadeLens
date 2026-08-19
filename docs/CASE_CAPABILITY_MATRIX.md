# Case capability matrix

Status: normative public navigation  
Machine source: [`content/cases/capability-matrix.json`](../content/cases/capability-matrix.json)

CascadeLens uses one case specification to generate the case artifact, decision profile, capability matrix, Workbench bundle, and public case page. A capability tag therefore points to an executable task and an evidence boundary; it is not a claim of expertise, empirical validation, adoption, or impact.

## Capability taxonomy

| Group | Capabilities | Question answered |
|---|---|---|
| Analysis | system mapping; uncertainty bounds; constrained optimization; sensitivity analysis; temporal reasoning | What is modeled, what changes, and which choices remain feasible? |
| Engineering | data systems; reproducible computation | Can another person trace, rerun, or reject the artifact? |
| Decision | evidence governance; stakeholder communication; public-interest ethics | What may be claimed, who is affected, and where must a decision stop? |
| Domain | financial risk; health informatics; behavioral experimentation; spatial and place policy; resilience operations | Which domain-specific structure and guardrail does the case exercise? |

## Sixteen executable profiles

| Case | Decision owner | Distinctive capabilities | Required user output |
|---|---|---|---|
| Suez route | Cross-border operations lead | temporal reasoning; uncertainty bounds; resilience operations | Buffer-versus-route comparison and evidence trigger |
| Semiconductors | Technology manufacturing planner | branch/merge system mapping; data systems; optimization | Qualification and allocation trade-off |
| Medical PPE | Public-health supply coordinator | public-interest ethics; access-oriented constraints | Safety-limited allocation boundary |
| Commodity compound | Food and energy resilience analyst | compound shocks; cycle-safe analysis; equity | Distributional unknowns and robust bundle |
| Panama drought | Network and route planner | dynamic activation; sensitivity; spatial policy | Reversible timing trigger |
| Red Sea routing | Global logistics risk lead | dynamic expiry; horizon comparison | Routing review threshold |
| Baltimore port | Regional infrastructure coordinator | place-based dependencies; burden shifting | Regional continuity and affected-group map |
| Refining hurricane | Essential-services continuity lead | criticality weighting; public-interest ethics | Essential-service prioritization boundary |
| Critical minerals | Strategic technology policy analyst | policy stress; evidence value; concentration | Diversification-versus-evidence comparison |
| Sanctions change | Financial-compliance operations lead | data governance; fail-closed review; financial risk | Accountable escalation path |
| Drug shortage | Medicine access coordinator | official-source isolation; care-access criticality | Supply option and clinical boundary |
| Food export compound | Food-system policy planner | joint shocks; affordability; Pareto analysis | Reserve and import-diversity frontier |
| Health interoperability | Health-information governance lead | terminology; provenance; workflow; population reporting | Automated-versus-manual review safeguard |
| Behavioral evidence | Program evaluation lead | measurement; assignment; null-result discipline | Reversible experiment and reporting boundary |
| Regeneration equity | Place-based regeneration planner | housing; access; transition costs; affected groups | Phased safeguard and displacement review trigger |
| Portfolio concentration | Portfolio risk committee | concentration; liquidity; mandate; fiduciary limits | Rebalancing frontier and suitability boundary |

## How to use the matrix

1. Start with a decision question, not a domain label.
2. Choose the case whose user tasks and stakeholder boundary are closest.
3. Run the case and inspect the lower, central, and upper graph eligibility.
4. Recompute the sensitivity surface before treating one parameter setting as robust.
5. Export the decision brief for communication and the RiskPack for independent recomputation.
6. Keep the result `scenario_only` until a separate outcome partition passes the historical-scoring gate.

The live case library is a human-readable view of the same generated matrix. Any mismatch among the specifications, matrix, Workbench bundle, and case catalog fails content validation.

