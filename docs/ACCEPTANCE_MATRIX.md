# Acceptance matrix

This file is the completion ledger. A requirement is complete only when the evidence column points to a current, independently inspectable artifact or command output. Passing a narrower test does not prove a broader requirement.

| ID | Requirement | Required evidence | Current status |
|---|---|---|---|
| A01 | WorldGraph schema and validation | Schema source, positive/negative tests, canonical snapshot fixture | In progress |
| A02 | Bitemporal no-lookahead behavior | Query tests plus replay leakage tests | Pending |
| A03 | Evidence-grade eligibility | Unit and integration tests proving inferred edges cannot enter primary estimates | Pending |
| A04 | ShockScript YAML/JSON contract | Versioned schema, parser, validation errors, examples | Pending |
| A05 | Cascade propagation | Baseline comparisons, convergence, cycles, multi-shock tests | Pending |
| A06 | MissingGraph bounds | Monotonicity and masked-edge coverage tests | Pending |
| A07 | InterventionLab | Feasibility, Pareto, robust-bound, and reversal tests | Pending |
| A08 | Observability Frontier | Decision-change and acquisition-cost tests | Pending |
| A09 | CascadeBench | Frozen cutoff, split outcomes, metric and leakage tests | Pending |
| A10 | RiskPack | Generate, verify, tamper, fresh-extract, and relative-checksum tests | Pending |
| A11 | Ten core connectors | Live contract docs, recorded fixtures, normalization and license tests | Pending |
| A12 | Twelve launch cases | Per-case source manifest, classification, results, limitations and rebuild | Pending |
| A13 | Data catalog and license safety | Machine inventory plus legal-mode checks | Pending |
| A14 | Web overview | Render and content tests | Pending |
| A15 | WorldGraph explorer | Keyboard/touch interaction and semantic visual-state tests | Pending |
| A16 | Scenario workbench | End-to-end scenario execution and export | Pending |
| A17 | Case, benchmark, data and method routes | Route render and navigation tests | Pending |
| A18 | CLI and TypeScript SDK | Fresh-install command tests and API examples | Pending |
| A19 | Accessibility | Automated audit plus keyboard and reduced-motion checks | Pending |
| A20 | Security and untrusted-input limits | Dependency, secret, path, archive, response-size and injection checks | Pending |
| A21 | Performance | Defined budgets and measured local/research fixtures | Pending |
| A22 | Documentation and contribution path | Quick start, architecture, connector/engine/replay guides | Pending |
| A23 | Release archive | Clean git archive, SBOM, relative checksums, exact-version manifest | Pending |
| A24 | Fresh archive reproducibility | `npm ci` and full CI from extracted archive without `.git` | Pending |
| A25 | Public hosting | Exact verified release deployed and reopened at public URL | Pending |
| A26 | Independent self-review cycles | Dated scorecards, issues, fixes, rerun evidence, no unresolved P1/P2/P3 | Pending |

## Scoring rule

The repository may be described as release-complete only when A01–A26 are all proven. A self-assigned score is not evidence; each score must be derived from the matrix and current artifacts.
