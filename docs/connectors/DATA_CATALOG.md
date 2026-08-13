# Data catalog and license gates

Verified against official publisher pages on 2026-08-12. This catalog is operational metadata, not legal advice. Dataset-specific metadata and terms are checked again at retrieval time.

| Connector | Runtime | Release mode | Evidence default | Hard boundary |
|---|---|---|---|---|
| [UN Comtrade](https://uncomtrade.org/docs/un-comtrade-api/) | Remote | `download_on_run` | Official observed | API access does not confer blanket raw-data redistribution rights. |
| [OECD ICIO](https://www.oecd.org/en/data/datasets/inter-country-input-output-tables.html) | Remote | `download_on_run` | Official observed | Country-industry accounts are not company supplier relationships. |
| [SEC EDGAR](https://www.sec.gov/search-filings/edgar-application-programming-interfaces) | Remote | `download_on_run` | Entity reported | Filings may omit operational relationships; fair-access rules apply. |
| [GLEIF](https://www.gleif.org/en/lei-data/gleif-api/) | Remote | `download_on_run` | Third-party verified | Legal ownership and identity are not commercial supply links. |
| [FAOSTAT](https://www.fao.org/contact-us/terms/db-terms-of-use/en) | Remote | `redistributable` when metadata permits | Official observed | Default CC BY 4.0 has dataset-specific third-party exceptions. |
| [openFDA Drug Shortages](https://open.fda.gov/apis/drug/drugshortages/) | Remote | `download_on_run` | Official observed | U.S. shortage status is not a global supply chain or clinical recommendation. |
| [OFAC SLS](https://ofac.treasury.gov/sanctions-list-service) | Remote | `download_on_run` | Official observed | OFAC lists are not a substitute for legal compliance analysis. |
| [World Bank WITS](https://wits.worldbank.org/witsapiintro.aspx?lang=en) | Remote | `download_on_run` | Official observed | Queries are bounded; underlying provider terms can also apply. |
| [UNCTAD LSCI](https://unctadstat.unctad.org/insights/theme/246) | Import only | `download_on_run` | Third-party verified | Published indices do not grant rights to MDS Transmodal source data. |
| [IMF PortWatch](https://www.imf.org/en/news/articles/2023/11/13/pr23390-imf-university-oxford-launch-portwatch-platform-simulate-trade-disruptions) | Import only | `user_provided` | Third-party verified | User exports only; no undocumented platform scraping. |

## Enforcement

- All remote requests require HTTPS, an identifying user agent, an allowlisted host, bounded size, timeout, retry ceiling, and a per-connector rate slot.
- API secrets are redacted from persisted request URIs.
- Every payload receives retrieval time, byte count, SHA-256, content type, terms URI, boundary statement, and a self-verifying manifest.
- Raw artifacts are rejected from release exports unless `rawRedistributable` is true.
- Synthetic contract fixtures test structure only and are explicitly forbidden as empirical evidence.
- Import-only connectors accept lawful user files and never scrape undocumented endpoints.

The canonical machine inventory is [`content/catalog/connectors.json`](../../content/catalog/connectors.json).
