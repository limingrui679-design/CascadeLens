# CascadeLens v0.5.0 relational-data and evidence-gate review

This maintainer review covers the exact `v0.5.0` release scope. It is internal software evidence, not an independent method or domain review, historical validation, user study, organizational adoption, or impact evaluation.

## Pass 1 — source and license boundary

- Source: U.S. Bureau of Economic Analysis, `Commodity-by-Industry Direct Requirements, After Redefinitions - Sector`.
- Frozen workbook: 124,435 bytes; SHA-256 `1590bb70bc05a39b367ba34344b45308873af09709384515a66df238f0124316`.
- Retrieval: `2026-08-14T05:34:06.210Z`; terms checked `2026-08-14`.
- Redistribution basis: recorded U.S. Government Public Domain basis with BEA attribution. No endorsement is claimed.

## Pass 2 — matrix and graph semantics

- The bounded XLSX reader selects the latest four-digit sheet, validates the exact table title and year, and requires a complete 15-by-15 matrix.
- The frozen 2023 sheet produces 225 row-order-stable normalized facts, 30 typed nodes, and 222 positive `inputs_to` edges; three zero coefficients do not become edges.
- Every edge preserves the published coefficient and unit, is graded `MODEL_INFERRED`, has `eligibleForPrimaryEstimate: false`, and is therefore excluded from lower and central estimates.
- Graph digest: `ffc5b20e0a6f5381da9ad1cba94c2eb4c5f21bea9d1fb7cdf356d27ad2264a9e`.
- These are sector-average statistical coefficients, not firm-level supplier links, current dependencies, calibrated causal effects, or outcomes.

## Pass 3 — parser, lineage, and deterministic reconstruction

- XLSX handling enforces archive entry, expanded-byte, per-entry, compression-ratio, path, duplicate, and nested-archive limits.
- Workbook parsing rejects unsafe relationships, formulas, error cells, duplicate cell references, duplicate matrix codes, unexpected dimensions, non-finite values, and coefficients outside 0–1.
- Public-snapshot verification now reruns all four normalizers from exact payload bytes, checks stable facts, validates each manifest and content digest, and deterministically remaps each graph.
- Frozen public scope: 4 snapshots, 4,027 facts, and 222 BEA sector edges. The other three snapshots remain generic metric-only graphs with zero edges.

## Pass 4 — evidence-count acceptance gate

- `content/validation/evidence-ledger.json` is the machine source of truth.
- `npm run validate:evidence` derives counts only from accepted, hashed JSON records and applies category-specific gates.
- Eight hashed protocol and intake artifacts are ready for historical replay, independent review, user research, adoption, and impact. Their status is `protocol_ready_not_evidence`, so they cannot increment a public count.
- Current accepted counts remain: historical replay 0; external review 0; structured user study 0; organizational adoption 0; real-world impact 0.

## Pass 5 — release and publication verification

The pre-tag release gate passed on 2026-08-14:

- 130/130 Node unit tests and 23/23 Python 3.12.13 tests passed.
- Eight rendered-route checks and two automated accessibility checks passed.
- Content validation confirmed 11 connectors, four frozen runs, 4,027 facts, 222 sector edges, and 12 `scenario_only` reference cases.
- Evidence validation confirmed five zero accepted counts and eight hashed, non-counting readiness artifacts.
- Security scanned 635 files with zero findings; the dependency audit reported zero vulnerabilities.
- The 20,000-node/19,999-edge research smoke completed in 3,018 ms with a 217,972,736-byte RSS increase, under the enforced 15,000 ms and 805,306,368-byte budgets.
- Client assets totaled 1,050,404 bytes; the largest client asset was 190,101 bytes, under the 1,500,000-byte and 300,000-byte budgets.
- Two network-blocked production builds matched exactly at SHA-256 `37c65f505237349cc53f6ee529d1fea335a28ac2fdee5b5ad211952e048db2f6`.

The immutable GitHub Release, fresh no-`.git` archive verification, and hosted-site identity are detached post-tag receipts. They do not convert this maintainer review into external validation.

## Remaining evidence boundary

All 12 reference cases remain `scenario_only`. The new BEA graph solves the prior absence of any published relational topology at a transparent sector aggregation; it does not solve historical accuracy, independent review, structured user research, organizational adoption, or real-world impact. Those counts must remain zero until a genuine external or outcome-separated artifact passes the machine gate.
