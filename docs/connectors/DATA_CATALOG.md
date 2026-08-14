# Data catalog and license gates

Verified against official publisher pages on each connector's recorded checked date. This catalog is operational metadata, not legal advice. Dataset-specific metadata and terms are checked again at retrieval time.

| Connector | Checked | Runtime | Release mode | Evidence default | Hard boundary |
|---|---|---|---|---|---|
| [UN Comtrade](https://uncomtrade.org/docs/un-comtrade-api/) | 2026-08-12 | Remote | `download_on_run` | Official observed | API access does not confer blanket raw-data redistribution rights. |
| [OECD ICIO](https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html) | 2026-08-12 | Remote | `download_on_run` | Official observed | Country-industry accounts are not company supplier relationships. |
| [SEC EDGAR](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | 2026-08-12 | Remote | `download_on_run` | Entity reported | Filings may omit operational relationships; fair-access rules apply. |
| [GLEIF LEI API](https://www.gleif.org/en/meta/lei-data-terms-of-use) | 2026-08-13 | Remote | `redistributable` under CC0 1.0 | Third-party verified | Legal ownership and identity are not commercial supply links. |
| [FAOSTAT](https://www.fao.org/contact-us/terms/db-terms-of-use/en) | 2026-08-13 | Remote | `redistributable` under default CC BY 4.0 when dataset metadata has no exception | Official observed | Dataset-specific third-party exceptions remain controlling. |
| [openFDA Drug Shortages](https://open.fda.gov/apis/drug/drugshortages/) | 2026-08-13 | Remote | `redistributable` under Public Domain / CC0 | Official observed | U.S. shortage status is not a global supply chain or clinical recommendation. |
| [OFAC SLS](https://ofac.treasury.gov/sanctions-list-service) | 2026-08-12 | Remote | `download_on_run` | Official observed | OFAC lists are not a substitute for legal compliance analysis. |
| [World Bank WITS](https://wits.worldbank.org/witsapiintro.aspx?lang=en) | 2026-08-12 | Remote | `download_on_run` | Official observed | Queries are bounded; underlying provider terms can also apply. |
| [UNCTAD LSCI](https://unctadstat.unctad.org/insights/theme/246) | 2026-08-12 | Import only | `download_on_run` | Third-party verified | Published indices do not grant rights to MDS Transmodal source data. |
| [IMF PortWatch](https://www.imf.org/en/news/articles/2023/11/13/pr23390-imf-university-oxford-launch-portwatch-platform-simulate-trade-disruptions) | 2026-08-12 | Import only | `user_provided` | Third-party verified | User exports only; no undocumented platform scraping. |
| [BEA Input-Output Accounts](https://www.bea.gov/industry/input-output-accounts-data) | 2026-08-14 | Remote | `redistributable` as U.S. Government Public Domain | Model inferred | Sector-average direct-requirements coefficients are not firm-level supplier links, current operational dependencies, or causal effects. |

## Enforcement

- All remote requests require HTTPS, an identifying user agent, an allowlisted host, bounded size, timeout, retry ceiling, and a per-connector rate slot.
- API secrets are redacted from persisted request URIs.
- Every payload receives retrieval time, byte count, SHA-256, content type, terms URI, boundary statement, and a self-verifying manifest.
- Raw artifacts are rejected from release exports unless `rawRedistributable` is true.
- Synthetic contract fixtures test structure only and are explicitly forbidden as empirical evidence.
- Import-only connectors accept lawful user files and never scrape undocumented endpoints.

## Frozen public runs

Four official-source runs are committed under recorded affirmative redistribution terms: FAOSTAT ASTI Researchers, one GLEIF LEI record, one openFDA Drug Shortages record, and the BEA 2023 sector direct-requirements workbook. Together they contain 4,027 normalized facts. The first three use the generic zero-edge mapping. The BEA artifact maps 225 published coefficients into 222 positive sector-level `inputs_to` edges; all remain `MODEL_INFERRED`, are excluded from lower and central estimates, and retain the published unit and matrix method. The test suite reruns each normalizer from the exact payload and recomputes every digest and graph.

These runs prove the four acquisition and transformation routes at their recorded retrieval times. They are not historical outcomes, calibrated model inputs, firm-level supplier relationships, external validation, adoption, or realized impact.

The canonical machine inventory is [`content/catalog/connectors.json`](../../content/catalog/connectors.json). Exact frozen-run receipts are in the [`snapshot catalog`](../../content/snapshots/catalog.json).
