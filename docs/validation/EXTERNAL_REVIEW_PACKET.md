# External review packet

This packet lets an independent method or domain reviewer assess one immutable release without relying on maintainer claims.

## Reviewer records

- Name, relevant expertise, and public professional profile where available.
- Financial, supervisory, collaboration, authorship, and other conflicts.
- Exact release tag and 40-character commit reviewed.
- Review dates, environment, commands or analytical procedure, and artifacts inspected.
- Complete findings: passes, failures, uncertainty, excluded scope, and unresolved issues.
- Permission to publish the record without private or restricted data.

## Minimum method review

1. Install from the tagged source archive in a fresh environment.
2. Run the release verifier and reproduce at least one RiskPack.
3. Inspect evidence-grade eligibility, no-lookahead controls, graph semantics, outcome separation, and the distinction between software integrity and empirical validity.
4. Challenge at least one assumption, malformed input, or evidence promotion and record the observed failure behavior.
5. State what the review does not establish.

## Minimum domain review

The reviewer must assess whether node and edge semantics, units, time interpretation, shock construction, outcome proxy, and decision limitations are appropriate for the named domain. Software tests alone do not satisfy this section.

Submit through the [external-review issue form](https://github.com/limingrui679-design/CascadeLens/issues/new?template=external-review.yml). The count remains zero until a named non-maintainer record, complete method, findings, conflicts, stable public report, and exact report hash pass the evidence validator.

