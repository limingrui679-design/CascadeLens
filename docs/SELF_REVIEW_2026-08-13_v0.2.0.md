# CascadeLens v0.2.0 audit-remediation review

This maintainer review records how the release responds to the independently reproduced findings against `main@c326fa6`. It is software evidence, not an independent domain review, historical validation, user study, or adoption record.

## Release boundary

- Twelve reference cases remain `scenario_only`.
- Historically scored cases: **0**.
- External method or security validations supplied by this repository: **0**.
- Organizational adoption or demonstrated real-user impact claims: **0**.
- Connector fixtures are fictional contract structures. Separately, three lawfully redistributable official-source runs are frozen with 3,802 normalized facts and zero inferred dependency edges; the other seven connector contracts do not bundle live payloads. None of the three snapshots is a historical outcome or calibrated model input.

## Finding-to-evidence matrix

| Finding | v0.2.0 behavior | Adversarial or regression evidence |
|---|---|---|
| RiskPack accepted self-rehashed derived tampering | Verifier reconstructs cascade, interventions, observability, and benchmark results from packaged inputs and compares canonical bytes. A separately retained expected digest is an optional second boundary. | [`riskpack.test.ts`](../tests/core/riskpack.test.ts) changes derived output and refreshes internal hashes; verification fails with `derived_output_mismatch`. It separately checks matching and mismatching external digests. |
| Canonical digest depended on process locale | Digest-bearing key and identifier order uses explicit UTF-8 bytes. Release SBOM component order uses the same comparator. | [`unicode-locale.test.ts`](../tests/core/unicode-locale.test.ts) asserts golden canonical-byte, graph, and RiskPack-checksum hashes under `C`, English, Swedish, and Turkish locales. |
| Benchmark accepted outcomes before the shock or horizon end | Outcome records declare metric, horizon, window, and availability; scoring requires a complete window from first shock through the selected horizon and an outcome-only source available after the window. | [`benchmark.test.ts`](../tests/core/benchmark.test.ts) blocks pre-shock, incomplete-window, unavailable, wrong-metric, and wrong-horizon outcomes and accepts a closed valid fixture. |
| Intervention lead time did not affect propagation | Each intervention receives an activation date; effects appear only on or after activation. Every horizon has its own active/pending set, frontier, and recommendation. | [`interventions.test.ts`](../tests/core/interventions.test.ts) covers 0/7/14/59-day activation and an over-limit intervention. |
| Connector stopped at raw payload | Remote CLI acquisition now writes the raw payload, verified source manifest, normalized content-addressed facts, and a conservative WorldGraph snapshot. Three official-source runs are frozen under recorded redistribution terms. | [`pipeline-node.test.ts`](../tests/connectors/pipeline-node.test.ts) exercises end-to-end output and deterministic resume. [`public-snapshots.test.ts`](../tests/connectors/public-snapshots.test.ts) rechecks all payload hashes, manifests, normalized digests, stable identities, graph digests, license descriptors, and zero-edge remapping. |
| Fact identity changed with response row order | Fact IDs derive from bounded canonical business content; exact duplicates receive deterministic ordinals. | [`adapters.test.ts`](../tests/connectors/adapters.test.ts) shuffles every one of the ten adapters and compares the full ID-to-fact set. |
| Corrupt checkpoint state was trusted | Resume revalidates containment, file type, raw length/hash, manifest, normalized digest/IDs, WorldGraph contract, and deterministic remapping. | [`pipeline-node.test.ts`](../tests/connectors/pipeline-node.test.ts) deletes, truncates, and mismatches artifacts and requires refetch. |
| FAOSTAT advertised ZIP without safe decoding | FAOSTAT accepts plain CSV or exactly one bounded CSV inside ZIP. | [`adapters.test.ts`](../tests/connectors/adapters.test.ts) covers plain/ZIP equality and rejects ambiguity, nesting, and path traversal; [`zip.ts`](../packages/connectors/src/zip.ts) enforces expansion budgets. |
| Cases were structurally templated | The catalog now spans chain, branch/merge, cycle, dynamic activation, and dynamic expiry, with four horizon profiles and varied constraints. | [`reference-cases.test.ts`](../tests/cases/reference-cases.test.ts) enforces structural-coverage counts. This is regression diversity, not empirical diversity. |
| Graph visibility was frozen at first-shock time | Node, edge, and shock target visibility is refreshed on every simulated event day. | [`cascade.test.ts`](../tests/core/cascade.test.ts) covers edges becoming valid and expiring inside a horizon. |
| CLI hid validation paths | Structured validation failures print stable path, code, and message without echoing the rejected value. | [`cli.test.ts`](../tests/cli/cli.test.ts) checks actionable output and secret non-disclosure. |
| Iteration controls had no solver semantics | `maxIterations` is a per-day fixed-point cap; `tolerance` can terminate convergence; simulated days and solver iterations are reported separately. | [`cascade.test.ts`](../tests/core/cascade.test.ts) covers a convergent cycle and explicit capped failure. |
| Archive expansion policy exceeded implementation | ZIP and TAR metadata are budgeted before extraction; embedded archives are counted and reject further nesting. | [`release-utils.test.ts`](../tests/release/release-utils.test.ts) covers entry, expanded-byte, ratio, and nested-archive failures; detached release verification exercises the normal path. |
| Package map omitted YAML | The package map declares the audited YAML parser and an automated documentation test checks that dependency edge. | [`documentation.test.mjs`](../tests/documentation.test.mjs) |
| CSP allowed inline scripts | Every HTML response receives a fresh nonce; all script elements receive it; `script-src` no longer contains `unsafe-inline`. | [`rendered-html.test.mjs`](../tests/rendered-html.test.mjs) and [`check-security.ts`](../scripts/check-security.ts) |
| Hosted build lacked machine-readable identity | `/build-info.json` exposes commit, Git tree, exact tag when present, dirty state, package version, lock digest, content and RiskPack catalog digests, build time, and hosting project id. | [`rendered-html.test.mjs`](../tests/rendered-html.test.mjs). The endpoint explicitly identifies itself as self-reported, not a third-party signature. |

## Verification ledger

- TypeScript strict check: pass.
- Unit, integration, CLI, artifact, connector, canonicalization, archive, and invariant suite: **95/95 pass**, 0 fail, 0 skip, 0 todo before the final tagged build.
- Dependency audit: 0 known vulnerabilities.
- Production build: pass. Vinext's current static route classifier reports an informational limitation for some routes; rendered-route tests directly exercise all public route categories and the branded 404.
- Enforced performance gate: pass. After caching only identical acyclic daily states, three consecutive pre-tag runs measured 3,412, 3,461, and 3,993 ms end to end. The final working-tree CI then measured 2,960 ms total—936 ms for construction/sealing and 2,024 ms for validation plus three-bound 7/30-day analysis—with a 182,550,528-byte RSS delta. Client assets measured 1,044,508 bytes total with a 190,101-byte maximum. The enforced limits remain 15,000 ms, 805,306,368 RSS-delta bytes, 1,500,000 total client bytes, and 300,000 bytes per asset. This is a synthetic 20,000-node/19,999-edge linear-graph engineering budget, not a production SLA or empirical-domain benchmark.
- The style policy still permits inline CSS for framework compatibility. Script execution does not permit `unsafe-inline`; this distinction is tested.
- The immutable `v0.2.0` release is required to include annotated tag identity, CycloneDX SBOM, canonical checksums, release manifest, archive-budget verification, and a detached no-`.git` full rebuild receipt.

## What this release does not establish

The tests show that the software follows its declared contracts on the checked fixtures and generated artifacts. They do not show that the propagation assumptions are realistic in any domain, that scenario bounds are calibrated, that a policy or operational decision improved, that an external reviewer agrees with the method, or that anyone adopted the product. Those claims require the prospective protocol in [`EXTERNAL_VALIDATION_PROTOCOL.md`](EXTERNAL_VALIDATION_PROTOCOL.md) and externally supplied evidence.
