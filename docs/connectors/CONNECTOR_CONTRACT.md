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
8. Write payload, manifest, normalized snapshot, conservative WorldGraph snapshot, and checkpoint atomically.
9. Before skipping a completed partition, recheck file containment and type, manifest digest, raw bytes and SHA-256, normalized content digest and fact IDs, WorldGraph validation, and deterministic remapping. Missing or corrupt state is fetched again.

## Normalization contract

Every normalized fact contains a row-order-independent stable id, fact kind, event-valid time, optional publisher time, source-availability time, retrieval time, observation/knowledge time, source locator, evidence grade, dimensions, measures, and attributes. Retrieval time is a conservative fallback when no earlier publisher availability can be evidenced; it must not overwrite event-valid time. A normalizer may not upgrade the connector default evidence grade. Source-specific concepts remain explicit; for example, a GLEIF parent relationship cannot be relabeled as a supplier relationship.

## WorldGraph mapping contract

The generic mapping converts each normalized fact into a content-addressed metric node and preserves timing, measures, attributes, evidence grade, source terms, and source-manifest lineage. It creates no dependency edges.

A connector-specific mapper may preserve a relationship only when the source artifact itself has explicit row and column semantics for that relation. The mapper must retain the published unit, method, time, evidence grade, and lineage; it may not promote a statistical coefficient into an observed firm-level link. Its output is recomputed from the frozen normalized snapshot during checkpoint and public-snapshot verification. The BEA mapper follows this rule: positive commodity-by-industry direct-requirements coefficients become sector-level `inputs_to` edges graded `MODEL_INFERRED`, marked ineligible for primary estimates, and therefore available only in the upper evidence bound.

## Archive input contract

An adapter that accepts ZIP or XLSX input must enforce path safety, entry and expanded-byte limits, compression-ratio limits, duplicate-entry rejection, and nested-archive rejection before decoding. FAOSTAT supports bounded plain CSV or one bounded CSV inside ZIP. The BEA mapper additionally rejects formulas, error cells, duplicate matrix codes, unexpected dimensions, unsafe workbook relationships, and non-finite or out-of-range coefficients.

## Fixture policy

Committed fixtures are fictional structures. They exercise parser contracts without republishing restricted publisher data. A successful fixture test proves software compatibility only—not current endpoint availability, data quality, empirical coverage, or license permission.

## Frozen public-snapshot policy

A real provider payload may be committed only when the descriptor records an affirmative redistribution basis, `rawRedistributable: true`, a checked date, attribution, and a machine-readable license. Every frozen run must retain its bounded query, exact payload bytes, source manifest, normalized snapshot, conservative WorldGraph snapshot, checkpoint, and cataloged hashes. The regression suite must rerun normalization from the exact payload and recompute every digest and graph mapping. These artifacts demonstrate an acquisition path at one retrieval time; a published sector coefficient is relational evidence only at that stated aggregation level, not a historical outcome, firm-level dependency, calibrated model input, external validation, or adoption.
