# Frozen public-source snapshots

This directory contains four dated outputs from the complete connector path: bounded official fetch, exact-byte digest, source manifest, normalization, stable fact identity, and evidence-preserving WorldGraph mapping. The matching query and checkpoint are preserved with each snapshot.

| Snapshot | Terms verified | Redistribution basis | Scope |
|---|---|---|---|
| FAOSTAT ASTI Researchers | 2026-08-13 | [FAO Statistical Database Terms](https://www.fao.org/contact-us/terms/db-terms-of-use/en), default CC BY 4.0 subject to dataset exceptions | 3,800 normalized statistical records from the official 33,190-byte normalized bulk ZIP |
| GLEIF LEI | 2026-08-13 | [GLEIF LEI Data Terms](https://www.gleif.org/en/meta/lei-data-terms-of-use), CC0 1.0 | One bounded LEI API record |
| openFDA Drug Shortages | 2026-08-13 | [openFDA Terms](https://open.fda.gov/terms/) and the catalog's Public Domain/CC0 label | One bounded drug-shortage API record |
| BEA sector direct requirements | 2026-08-14 | [BEA public-domain FAQ](https://www.bea.gov/help/faq/145) | 225 published 2023 commodity-by-industry coefficients; 222 positive coefficients become upper-bound-only `inputs_to` edges |

The exact attribution, query and checkpoint hashes, byte counts, source hashes, normalized digests, graph digests, and paths are in [`catalog.json`](catalog.json). Generic graphs have zero dependency edges. The BEA-specific mapper preserves the published sector relation and unit, keeps every edge at `MODEL_INFERRED`, and excludes it from lower and central estimates. A sector coefficient is not evidence that a particular firm depends on another firm.

These snapshots prove that four lawful public-data routes were run end to end at the recorded time. They do not establish current endpoint availability after that time, model calibration, a historical replay outcome, external method validation, client work, adoption, or real-world impact. The repository's license interpretation is a documented engineering gate, not legal advice.
