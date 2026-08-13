# Data and artifact license inventory

This inventory governs the files distributed in the repository and release archive. It is not legal advice and does not replace provider terms.

| Artifact | Included payload | Source/author | License or access mode | Redistribution decision |
|---|---|---|---|---|
| Source code, schemas, docs | Original CascadeLens work | Mingrui Li | Apache-2.0 | Included |
| `content/catalog/connectors.json` | Connector metadata and official links | CascadeLens synthesis | Apache-2.0; provider terms remain authoritative | Included |
| `tests/connectors/fixtures/*` | Synthetic contract fixtures, not copied provider records | CascadeLens | Apache-2.0 | Included |
| Twelve context citations | URI, title, publisher, dates, canonical-record digest | Named official/public publishers | Citation metadata only | Included; no source-page payload |
| Twelve assumed graphs/scenarios/results | Generated research assumptions and deterministic outputs | CascadeLens | Apache-2.0 | Included |
| Twelve RiskPack ZIPs | Same assumed artifacts, model cards, checksums and results | CascadeLens | Apache-2.0 | Included |
| UN Comtrade, OECD ICIO, SEC EDGAR, GLEIF, FAOSTAT, openFDA, OFAC, WITS, UNCTAD LSCI, IMF PortWatch | No live provider payload in repository | Named providers | `download_on_run`, `user_provided`, or descriptor-specific mode | Not mirrored; connector queries/manifests only |
| `public/social-card.png` | Original generated editorial network illustration | OpenAI ImageGen for CascadeLens | Project asset under Apache-2.0 | Included |
| `vendor/image-size` | Original allowlisted PNG/JPEG/GIF dimension parser | CascadeLens | Apache-2.0 | Included |

The machine-readable connector inventory is `content/catalog/connectors.json`; provider-specific access boundaries are documented in `docs/connectors/DATA_CATALOG.md`. Raw provider payloads may be exported only when a connector descriptor explicitly sets `rawRedistributable: true` and the user complies with the cited terms.
