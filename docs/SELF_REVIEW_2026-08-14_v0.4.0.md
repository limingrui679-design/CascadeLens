# CascadeLens v0.4.0 Python-first five-pass review

This is a maintainer review of the exact `v0.4.0` release scope. It is internal software evidence, not an independent method or domain review, security certification, historical validation, usability study, adoption record, or impact evaluation.

## Five review passes

| Pass | Question | Evidence and result |
|---|---|---|
| 1. User path | Can an analyst install and complete a useful run without Node.js? | The dependency-free Python 3.11+ package exposes a CLI and API, accepts JSON, CSV, GraphML, and NetworkX, and creates a recomputation-verifiable scenario-only RiskPack. Clean Python 3.12 and 3.13 installs passed the complete package tests and produced the same demo pack digest; CI independently covers 3.11, 3.12, and 3.13. |
| 2. Analytical agreement | Does Python reproduce the reviewed product artifacts? | [`test_reference_parity.py`](../tests_python/test_reference_parity.py) executes all 12 published snapshots and ShockScripts and compares every horizon, lower/central/upper result, intervention output, and benchmark status with the reviewed TypeScript artifacts to numerical tolerance. This is implementation parity, not proof of domain correctness. |
| 3. Input and evidence safety | Can ambiguous input gain a stronger status or be silently repaired? | Python and browser adapters reject non-finite or out-of-range weights, inconsistent bounds, duplicate nodes, missing endpoints, oversized input, and GraphML DTD/entity declarations. Undirected GraphML and NetworkX relations are explicitly expanded both ways. Imported topology remains user-provided `MODEL_INFERRED`, outside lower and central propagation. RiskPack verification rejects extra files, links, checksum drift, semantic metadata drift, and self-consistently rehashed derived tampering. |
| 4. Product and release | Do the visual product and detached artifacts exercise the same contract? | The Workbench exposes all 12 cases, local graph and ShockScript import, bounded recomputation, export, and a real captured workflow GIF. The web suite enforces render, accessibility, security, dependency-audit, performance, and offline byte-reproducibility gates. The detached release verifier repeats Python source tests and demo verification, regenerates content without `.git`, reruns web CI, and matches the complete production tree digest. |
| 5. Claims and publication | Are public claims no stronger than the evidence? | The README, product, methods note, model cards, adoption ledger, and issue templates preserve zero historically scored cases, zero external validations, zero verified organizational adoptions, and zero demonstrated real-world impacts. `/build-info.json` binds the deployed product to the tagged source identity while describing that receipt as self-attestation. |

## Enforced local checks

- 128 TypeScript/JavaScript unit and adversarial checks;
- 23 Python unit, parity, import, CLI, benchmark, validation, and RiskPack checks;
- Python clean install, CLI demo, and RiskPack recomputation on 3.12 and 3.13, with 3.11 covered in CI;
- rendered-route, accessibility, repository-security, dependency-audit, performance, content-validation, documentation, and two-build offline reproducibility gates;
- a fresh no-`.git` release-archive verification with a detached receipt.

Exact release checksums and machine-readable verification results ship with the [GitHub release](https://github.com/limingrui679-design/CascadeLens/releases/tag/v0.4.0). The current external-evidence counts and the gates for changing them are in [`ADOPTION_AND_VALIDATION_STATUS.md`](ADOPTION_AND_VALIDATION_STATUS.md).

## Remaining evidence gaps

The release does not establish calibrated real-world weights, causal correctness, predictive accuracy, a methodologically correct domain deployment, independent review, security certification, structured usability outcomes, organizational adoption, or real-world impact. Those are separate future evidence programs; they cannot be inferred from software tests, a hosted demo, repository traffic, stars, or internal reproducibility.
