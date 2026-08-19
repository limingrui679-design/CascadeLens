# CascadeLens v0.6.0 decision-case review

This is a maintainer review of the exact `v0.6.0` source scope. It is internal
software evidence, not an independent method or domain review, historical
validation, structured user research, organizational adoption, or impact
evaluation.

## Reviewed scope

- 16 deterministic reference cases: 9 quasi-historical re-stresses and 7
  synthetic stress fixtures.
- 15 public capabilities, with a decision owner, stakeholders, methods, user
  tasks, trade-offs, and a guardrail for every case.
- One generated source of truth for the case catalog, capability matrix, and
  browser Workbench inputs.
- Operation-aware scenario controls, a 25-run normalized-severity–transmission
  surface, JSON export, and an evidence-bounded Markdown decision brief.
- Eleven connector contracts and four frozen official-source runs containing
  4,027 normalized facts and 222 published BEA sector-level dependency edges.

The BEA edges are upper-bound-only `MODEL_INFERRED` analytical inputs. They are
not firm-level supplier links, causal effects, historical outcomes, or evidence
that any case predicts realized impact.

## Five-pass audit

### 1. Claim and evidence boundary

Every public surface was checked against the machine evidence ledger. The
benchmark page and README now display all five zero counts, and each count is
paired with the minimum record that could legitimately change it. Internal
tests, maintainer review, a hosted demo, stars, traffic, and software downloads
remain ineligible.

### 2. Case integrity and cross-surface agreement

All 16 cases rebuild into complete RiskPacks and retain `scenario_only` with
zero outcome observations. Content validation compares source specifications,
the case catalog, capability matrix, and Workbench bundle case by case; it
rejects a missing case, changed decision profile, mismatched scenario ID,
decision-question drift, or stale graph digest.

### 3. Method and interaction audit

Browser testing found that the original 5 × 5 surface changed the stored
`magnitude` of a binary `disable` operation even though the engine correctly
treats disable as severity 1. The result was 25 recomputations with five
identical shock columns. The implementation now:

- keeps the reviewed base run binary and disables its ineffective magnitude
  control;
- maps the sensitivity axis to normalized severity;
- discloses the partial-capacity proxy used only for binary-disable sensitivity;
- preserves operation-correct mapping for capacity, demand, supply, policy,
  cost, and financial stresses; and
- fails tests unless every Suez severity column changes monotonically and
  demand-increase grids remain finite and ordered.

The Workbench also preserves a 120% demand increase as `1.2` instead of
silently clipping it to `1.0`.

### 4. Runtime, security, accessibility, and performance

The release candidate is checked through the repository CI command, Python
source tests, deterministic case/RiskPack regeneration, rendered-route checks,
all-route automated accessibility analysis, strict response-header and secret
scanning, dependency audit, and the enforced 20,000-node performance profile.

| Verification run | Result |
|---|---|
| TypeScript/Node unit suite | 133 passed, 0 failed |
| Python source suite | 23 passed, 0 failed |
| Documentation suite | 9 passed, 0 failed |
| Rendered-route suite | 9 passed, 0 failed |
| Automated accessibility suite | 2 passed, 0 failed |
| Security scan and dependency audit | 775 files scanned, 0 findings, 0 known vulnerabilities |
| Client bundle budget | 1,144,661 / 1,500,000 bytes |
| Largest client asset budget | 190,101 / 300,000 bytes |
| 20,000-node / 19,999-edge smoke run | 7,804 / 15,000 ms; 176,324,608 / 805,306,368 RSS-delta bytes |
| Two offline production builds | Exact match: `0033f7f0f293eeec8e8a68f402a071b2a872659938e0f363cf3aafde6baa4cc9` |

The browser review covers 1440 × 900 desktop, 390 × 844 mobile, and the minimum
320-pixel supported width. It verifies the 16-case selector, binary and demand
controls, recomputation, the non-degenerate 25-cell surface, horizontal table
containment, and absence of page-level horizontal overflow. README screenshots
and the Workbench GIF were recaptured from this product state.

### 5. Release and public-host identity

The release process binds the annotated tag, commit, Git tree, package and
Python versions, generated artifacts, RiskPack catalog, SBOM, and complete
production build digest. Detached verification repeats Python execution,
generation, full web CI, and two offline builds from an archive without `.git`.
The final release receipt and hosted `/build-info.json` comparison are recorded
after the immutable tag and public deployment are complete.

## Current evidence status

| Evidence category | Accepted count | Why it remains zero |
|---|---:|---|
| Historically scored cases | 0 | No frozen-cutoff case has separated post-event outcomes passing the registered protocol. |
| External method or domain reviews | 0 | No independent named reviewer record has passed the evidence gate. |
| Structured user studies | 0 | No consented, task-based study with complete success and failure records has been published. |
| Verified organizational adoption | 0 | No identifiable organization has supplied a publishable adoption record. |
| Demonstrated real-world impact | 0 | No defensible causal or counterfactual impact record exists. |

## Residual limitations

No repository-only change can truthfully convert any of these five zeros into a
positive count. The next valid step is to execute the existing historical
replay and external-review packets with independent participants and separated
outcomes. Until then, all 16 cases remain research scenarios rather than
forecasts, client work, deployments, or evidence of real-world effect.
