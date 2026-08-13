# CascadeLens v0.1.0 self-review

Date: 2026-08-13  
Scope: software correctness, evidence governance, release integrity, web quality, security, accessibility, and reproducibility  
Disposition: release-complete against the 26-item acceptance contract

This is a structured maintainer self-review, not an independent external review or empirical validation. The score below measures completion of the repository's published acceptance contract only.

## Contract score

| Area | Acceptance IDs | Result |
|---|---|---|
| Data model and evidence controls | A01–A04 | 4/4 verified |
| Analysis and decision methods | A05–A09 | 5/5 verified |
| Reproducible artifacts and data interfaces | A10–A13 | 4/4 verified |
| Web and developer product | A14–A19 | 6/6 verified |
| Security, performance, documentation, and release | A20–A26 | 7/7 verified |
| **Total** | **A01–A26** | **26/26, 100%** |

The evidence for every item is linked from [`ACCEPTANCE_MATRIX.md`](ACCEPTANCE_MATRIX.md). The 100% result does not mean perfect real-world prediction, production fitness for every use, external endorsement, or user impact.

## Review cycles and closed findings

| Cycle | Finding | Severity | Resolution | Rerun evidence |
|---|---|---:|---|---|
| Model and decision contract | Intervention tests did not prove the published reversal-threshold equation. | P2 | Added exact adjacent-Pareto threshold, direction, finiteness, and positivity assertions. | `tests/core/interventions.test.ts`; unit suite 70/70 |
| Model and decision contract | Observability tests did not exercise a candidate that changes the preferred decision or show the acquisition-cost status flip. | P2 | Added a deterministic 0.5 decision-change case, positive EVPI/net value, high-cost rejection, and input non-mutation checks. | `tests/core/observability.test.ts`; unit suite 70/70 |
| Release archive | The safe-path rule rejected framework route names containing `[slug]`. | P1 | Allowed bounded framework brackets while continuing to reject traversal and absolute paths; added boundary tests. | `tests/release/release-utils.test.ts`; fresh archive verification |
| Release archive | A required hosting build plugin lived under an ignored directory and was absent from a clean source archive. | P1 | Moved it to tracked `scripts/sites-vite-plugin.ts` and made the content validator require it. | Clean install/build from archive without `.git` |
| Responsive product | Desktop navigation disappeared at narrow widths without a replacement. | P2 | Added an accessible disclosure navigation with visible focus and verified it at 390×844. | Manual browser QA and automated accessibility suite |
| Workbench | Browser export was observable only as a UI side effect. | P2 | Extracted a pure, typed export builder and added a parseable, truth-labelled payload test. | `tests/web/workbench-export.test.ts` |
| Supply-chain integrity | Workflow actions used mutable tag references. | P2 | Pinned official actions to verified commit SHAs. | Workflow source inspection and security scan |
| Performance | The original social image exceeded the largest-client-asset budget. | P3 | Converted and compressed the generated image to a 1200×630 JPEG while preserving the design. | Largest client asset 190,101 bytes under 300,000-byte budget |
| SBOM | The local audited image parser was represented as `vendor/image-size` rather than the package name `image-size`. | P3 | Corrected non-registry lock-path name derivation and added deterministic inventory, lock-hash, timestamp, purl, and path assertions. | `tests/release/sbom.test.ts`; 621 components |
| Release communication | README still described the tagged release as active development. | P3 | Replaced it with the exact v0.1.0 scope and public product URL. | Content validation and rendered route checks |

## Final automated gate

`npm run ci` passed on 2026-08-13 with:

- ESLint and strict TypeScript: pass.
- Unit/integration/invariant tests: 70 passed, 0 failed.
- SDK/CLI example chain: pass, including scenario validation and RiskPack verification.
- Content contract: 17 required artifacts, 10 connectors, and 12 verified scenario-only cases.
- Production build: pass for all nine route categories.
- Rendered HTML: 4 passed, 0 failed.
- Accessibility: 2 passed, 0 serious-impact findings.
- Security: 482 files scanned, required response headers present, 0 findings, 0 dependency vulnerabilities.
- Performance: 1,005,893 client bytes under 1,500,000; largest client asset 190,101 bytes under 300,000.
- Research smoke profile: 20,000 nodes, 19,999 edges, two horizons in 4,795 ms, with 218,775,552 bytes RSS growth; both remain below their enforced budgets.

The detached release verifier additionally checks canonical relative checksums, archive path/type safety, exact manifest identity, matching SBOM, `npm ci` without `.git`, deterministic regeneration, and the complete CI gate. Its hash-verified receipt is stored beside the final archive as `release/v0.1.0/verification-report.json` and `verification-report.sha256`.

## Browser and public-release gate

Desktop and 390×844 mobile QA covered `/`, `/workbench`, `/worldgraph`, `/cases`, a dynamic case route, `/benchmark`, `/data`, `/methodology`, and `/docs`. Checks included headings, titles, landmarks, navigation, overflow, image loading, visible focus, mobile disclosure navigation, case filtering, inferred-edge visibility, workbench recomputation/share/export, and direct RiskPack download verification.

The final immutable release is reopened at <https://cascadelens.limingrui2.chatgpt.site/> after deployment. The public gate rechecks all route responses, release metadata, security headers, robots/sitemap identity, and a downloaded RiskPack checksum before publication is declared complete.

## Residual evidence boundary

Release v0.1.0 contains 12 scenario-only cases and 0 historically scored cases. It has 0 recorded external validations and makes 0 claims of organizational adoption or real-user impact. Public-data context, deterministic software tests, fresh-archive reproducibility, and public hosting do not convert declared graph assumptions or simulated outcomes into observed facts.

No unresolved P1, P2, or P3 software/release findings remain in this review. External domain validation and genuine user-impact evidence are intentionally outside this software release score and must be added only when independently documented.
