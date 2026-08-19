# Data and artifact license inventory

This inventory governs the files distributed in the repository and release archive. It is not legal advice and does not replace provider terms.

| Artifact | Included payload | Source/author | License or access mode | Redistribution decision |
|---|---|---|---|---|
| Source code, schemas, docs | Original CascadeLens work | Mingrui Li | Apache-2.0 | Included |
| `content/catalog/connectors.json` | Connector metadata and official links | CascadeLens synthesis | Apache-2.0; provider terms remain authoritative | Included |
| `tests/connectors/fixtures/*` | Synthetic contract fixtures, not copied provider records | CascadeLens | Apache-2.0 | Included |
| Sixteen context citations | URI, title, publisher, dates, canonical-record digest | Named official/public publishers | Citation metadata only | Included; no source-page payload |
| Sixteen assumed graphs/scenarios/results | Generated research assumptions and deterministic outputs | CascadeLens | Apache-2.0 | Included |
| Sixteen RiskPack ZIPs | Same assumed artifacts, model cards, checksums and results | CascadeLens | Apache-2.0 | Included |
| `content/snapshots/faostat-asti-researchers` | One 33,190-byte official ASTI Researchers bulk ZIP plus query, manifest, normalized facts, zero-edge graph, and checkpoint | Food and Agriculture Organization of the United Nations | [FAO Statistical Database Terms](https://www.fao.org/contact-us/terms/db-terms-of-use/en), default CC BY 4.0 subject to dataset exceptions; checked 2026-08-13 | Included with cataloged attribution and digests |
| `content/snapshots/gleif-lei-one` | One bounded official LEI API record plus query, manifest, normalized fact, zero-edge graph, and checkpoint | Global Legal Entity Identifier Foundation | [CC0 1.0](https://www.gleif.org/en/meta/lei-data-terms-of-use); checked 2026-08-13 | Included; no endorsement or affiliation implied |
| `content/snapshots/openfda-drug-shortage-one` | One bounded official Drug Shortages API record plus query, manifest, normalized fact, zero-edge graph, and checkpoint | U.S. Food and Drug Administration | [Public Domain / CC0](https://open.fda.gov/terms/); checked 2026-08-13 | Included; no FDA endorsement implied |
| `content/snapshots/bea-2023-direct-requirements` | Official 124,435-byte sector direct-requirements XLSX plus query, manifest, 225 normalized coefficients, 222 upper-bound-only sector edges, and checkpoint | U.S. Bureau of Economic Analysis | [U.S. Government Public Domain](https://www.bea.gov/help/faq/145); checked 2026-08-14 | Included with attribution; coefficients are not firm-level relationships or BEA endorsement |
| UN Comtrade, OECD ICIO, SEC EDGAR, OFAC, WITS, UNCTAD LSCI, IMF PortWatch | No live provider payload in repository | Named providers | `download_on_run`, `user_provided`, or descriptor-specific mode | Not mirrored; connector contracts and synthetic fixtures only |
| `public/social-card.jpg` | Original generated editorial network illustration | OpenAI ImageGen for CascadeLens | Project asset under Apache-2.0 | Included |
| `public/fonts/geist-*.woff2` | Repository-local Geist Sans and Geist Mono variable web fonts | Vercel / Geist contributors | SIL Open Font License 1.1; full text in `public/fonts/OFL.txt` | Included; avoids remote build-time font retrieval |
| `vendor/image-size` | Original allowlisted PNG/JPEG/GIF dimension parser | CascadeLens | Apache-2.0 | Included |

The machine-readable connector inventory is `content/catalog/connectors.json`; the exact frozen-run receipts are in `content/snapshots/catalog.json`; provider-specific access boundaries are documented in `docs/connectors/DATA_CATALOG.md`. Raw provider payloads may be exported only when a connector descriptor explicitly sets `rawRedistributable: true` and the user complies with the cited terms.
