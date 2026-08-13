# Connector contract

A connector is complete only when it supplies a versioned descriptor, bounded request builder or explicit import-only gate, normalizer, evidence default, official documentation and terms links, synthetic contract fixture, and tests for lineage and license behavior.

## Remote acquisition contract

1. Accept a bounded typed query; reject whole-database or unconstrained requests.
2. Build only an HTTPS URL on the connector allowlist.
3. Require a real contact in the user agent when the publisher requires automated-client identification.
4. Apply the stricter of the publisher rule and the descriptor interval.
5. Retry only `429` and server errors, at most three times, with a 60-second per-attempt ceiling.
6. Reject redirects, oversized declared bodies, oversized streaming bodies, header injection, embedded credentials, and secret-bearing persisted URLs.
7. Hash the exact response bytes before normalization.
8. Write payload, manifest, and checkpoint atomically; an interrupted partition is retried, never marked complete.

## Normalization contract

Every normalized fact contains a stable id, fact kind, valid time, observation time, source locator, evidence grade, dimensions, measures, and attributes. A normalizer may not upgrade the connector default evidence grade. Source-specific concepts remain explicit; for example, a GLEIF parent relationship cannot be relabeled as a supplier relationship.

## Fixture policy

Committed fixtures are fictional structures. They exercise parser contracts without republishing restricted publisher data. A successful fixture test proves software compatibility only—not current endpoint availability, data quality, empirical coverage, or license permission.
