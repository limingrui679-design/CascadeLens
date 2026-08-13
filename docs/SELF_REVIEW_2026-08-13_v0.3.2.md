# CascadeLens v0.3.2 audit-remediation review

This maintainer review records how `v0.3.2` responds to independently reproduced findings against `v0.2.1@4911251`. It is internal software evidence, not an independent domain review, security certification, historical validation, user study, adoption record, or impact evaluation.

## Release boundary

- Twelve reference cases remain `scenario_only`.
- Historically scored cases: **0**.
- External method or security validations supplied by this repository: **0**.
- Organizational adoption or demonstrated real-user impact claims: **0**.
- The three frozen official-source connector runs contain 3,802 normalized facts and zero inferred dependency edges. The other seven connectors ship contracts and fictional multi-row test fixtures, not live provider payloads.

## Finding-to-evidence matrix

| Independently reproduced finding | v0.3.2 control | Adversarial or regression evidence |
|---|---|---|
| P1: a self-rehashed pack could claim a false validation status, delete limitations, or contradict its actual parameters | Assumption registers, model cards, and limitations have strict versioned runtime and JSON Schema contracts. Every assumption identifies a supported `parameterPath` and `targetId`; the verifier requires a one-to-one match with the packaged scenario, every inferred graph edge, and every observation candidate. The assumption register's exact bytes, length, and SHA-256 must match its unique packaged input-source record. Model-card status and all limitations are reconstructed from the packaged scenario and benchmark and compared canonically. | [`riskpack.test.ts`](../tests/core/riskpack.test.ts) changes validation status, removes model-card and pack limitations, and changes an assumption value while refreshing internal checksums. Verification fails semantically. [`json-schema.test.ts`](../tests/core/json-schema.test.ts) validates live artifacts against the three published metadata schemas. |
| P2: production web bundle bytes were outside the reproducibility proof and fonts were fetched remotely | Geist Sans and Mono are repository-local. Offline builds block non-loopback network access. Build-scoped framework entropy is derived from source identity, and the complete `dist` tree is compared byte for byte. The release manifest binds that digest to commit, tree, tag, version, and date; detached verification rebuilds it twice without `.git`. | [`reproducibility.test.ts`](../tests/build/reproducibility.test.ts), [`verify-build-reproducibility.ts`](../scripts/verify-build-reproducibility.ts), [`prepare-release.ts`](../scripts/prepare-release.ts), [`verify-release.ts`](../scripts/verify-release.ts), and the Linux/macOS `reproducible-build` CI matrix. The deterministic preloader is build-only; response nonces still use runtime entropy. The outer worker blocks public draft, prerender, and revalidation control paths, headers, and cookie before dispatch. |
| P2: row-order tests reversed only one-record fixtures | Every one of the ten adapter fixtures contains at least three distinct records. Tests reverse and rotate records, reverse CSV columns or JSON field order, and add both exact duplicates and duplicate business keys with altered non-key content. | [`adapters.test.ts`](../tests/connectors/adapters.test.ts) compares complete normalized fact maps and stabilized unique IDs for all transformations. |
| P3: style CSP allowed `unsafe-inline` | Framework-emitted scripts and styles receive one fresh per-response nonce. Both `script-src` and `style-src` reject `unsafe-inline`; `style-src-attr 'none'` blocks style attributes. The workbench's dynamic fill is rendered with a native progress element and static CSS. | [`rendered-html.test.mjs`](../tests/rendered-html.test.mjs) inspects every public route category and [`check-security.ts`](../scripts/check-security.ts) enforces the source and response policy. |

## Compatibility decision

The breaking metadata change advanced the product to `0.3.0` because assumption registers and model cards gained required semantic-binding fields. During pre-publication detached verification, the verifier correctly found that a tagged build digest contained stale files retained from an earlier output directory. `v0.3.1` made every production build remove `dist`, `.next`, and `.vinext` first, and made the real two-build verifier inject a stale sentinel that must disappear. `v0.3.2` adds repository-level immutable releases and uses a draft-first publication so the published tag, commit binding, assets, and GitHub release attestation are locked. The WorldGraph, ShockScript, and RiskPack-manifest schemas remain at `0.1.0`; engine semantics remain at `0.2.0`; the three metadata schemas remain at `1.0.0`. Existing RiskPacks must be verified with the matching historical release.

## Verification ledger

- Strict lint and TypeScript checks: **pass**.
- Unit, integration, CLI, artifact, connector, canonicalization, archive, and invariant suite: **123/123 pass**, with 0 fail, 0 skip, and 0 todo.
- Rendered routes, framework-control rejection, and 404: **8/8 pass**.
- Automated accessibility audit: **2/2 pass**.
- Dependency audit: **0 known vulnerabilities**.
- Repository security scan and strict nonce CSP checks: **600 files scanned, 0 findings**.
- Two final pre-tag runs of the 20,000-node/19,999-edge synthetic engineering smoke profile passed in 5,200–5,625 ms with 177,209,344–178,487,296-byte RSS deltas; client assets totaled 959,614 bytes and the largest was 190,101 bytes. These bounded measurements are not a production SLA or empirical-domain benchmark.
- The exact clean-tag offline production double-build digest is recorded in the detached release manifest and verification report, avoiding a circular digest claim inside the source tree that determines the build identity.
- The release gate additionally requires the exact commit to pass the complete Ubuntu CI job and two-build reproducibility on both Ubuntu and macOS. The immutable release must include the annotated tag, source ZIP and tarball, CycloneDX SBOM, canonical relative checksums, release manifest with `dist` digest, and detached no-`.git` verification receipt.

## What this release does not establish

These controls show that the software follows its declared contracts on checked fixtures and generated artifacts, and that its release can be reproduced within the declared environment matrix. They do not show that propagation assumptions are realistic, scenario bounds are calibrated, an operational decision improved, an independent reviewer agrees with the method, or anyone adopted the product. Those claims require separately retained evidence under [`EXTERNAL_VALIDATION_PROTOCOL.md`](EXTERNAL_VALIDATION_PROTOCOL.md).
