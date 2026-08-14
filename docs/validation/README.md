# Validation evidence path

CascadeLens separates a ready protocol from accepted evidence. A template, internal test, maintainer review, page view, repository star, or unpublished pilot never increments an evidence count.

| Goal | Ready-to-run artifact | Counted only after |
|---|---|---|
| Historical scoring | [Historical replay protocol](HISTORICAL_REPLAY_PROTOCOL.md) | A pre-outcome protocol commit, frozen cutoff inputs, separated later outcomes, and a leakage-free `historically_scored` result |
| Independent review | [External review packet](EXTERNAL_REVIEW_PACKET.md) | A named non-maintainer reviewer publishes scope, conflicts, method, complete findings, and the reviewed commit |
| Structured user research | [User-study protocol](USER_STUDY_PROTOCOL.md) | Consented participants complete predefined tasks and all successes, failures, and withdrawals are reported |
| Organizational adoption | [Adoption and impact record](ADOPTION_AND_IMPACT_RECORD.md) | An identifiable organization permits publication of dated, task-specific usage evidence |
| Real-world impact | [Adoption and impact record](ADOPTION_AND_IMPACT_RECORD.md) | A measured outcome is supported by a defensible baseline or counterfactual, not product use alone |

The machine-readable status is [`content/validation/evidence-ledger.json`](../../content/validation/evidence-ledger.json). Accepted records live under `content/validation/accepted/` and are rejected by `npm run validate:evidence` unless every category-specific gate is present.

