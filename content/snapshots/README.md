# Frozen public-source snapshots

This directory contains three small, dated outputs from the complete connector path: bounded official fetch, exact-byte digest, source manifest, normalization, stable fact identity, and conservative WorldGraph mapping. The matching query and checkpoint are preserved with each snapshot.

| Snapshot | Terms verified | Redistribution basis | Scope |
|---|---|---|---|
| FAOSTAT ASTI Researchers | 2026-08-13 | [FAO Statistical Database Terms](https://www.fao.org/contact-us/terms/db-terms-of-use/en), default CC BY 4.0 subject to dataset exceptions | 3,800 normalized statistical records from the official 33,190-byte normalized bulk ZIP |
| GLEIF LEI | 2026-08-13 | [GLEIF LEI Data Terms](https://www.gleif.org/en/meta/lei-data-terms-of-use), CC0 1.0 | One bounded LEI API record |
| openFDA Drug Shortages | 2026-08-13 | [openFDA Terms](https://open.fda.gov/terms/) and the catalog's Public Domain/CC0 label | One bounded drug-shortage API record |

The exact attribution, query and checkpoint hashes, byte counts, source hashes, normalized digests, graph digests, and paths are in [`catalog.json`](catalog.json). Every generic graph has zero dependency edges: a normalized public fact is not evidence that one organization, route, industry, or product depends on another.

These snapshots prove that three lawful public-data routes were run end to end at the recorded time. They do not establish current endpoint availability after that time, model calibration, a historical replay outcome, external method validation, client work, adoption, or real-world impact. The repository's license interpretation is a documented engineering gate, not legal advice.
