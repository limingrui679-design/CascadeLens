# Release process

1. Regenerate the connector catalog, twelve cases, and deterministic RiskPack archives.
2. Run `npm run ci` from the working tree.
3. Generate the CycloneDX SBOM with `npm run generate:sbom`.
4. Commit the exact tree and tag it with an annotated semantic version.
5. Run `npm run release:prepare -- vX.Y.Z` to create a clean source archive, manifest, and relative checksum file from the tag.
6. Run `npm run release:verify -- release/vX.Y.Z` to extract the archive without `.git`, run `npm ci`, regenerate deterministic artifacts, execute full CI, and compare committed generated artifacts.
7. Host only the exact build produced from the verified tag, then reopen the public URL and verify routes, security headers, downloads, and metadata.
8. Publish the archive, checksum, manifest, SBOM, and tag only after every step passes.

Integrity, tests, and hosting do not establish empirical model validity, external review, adoption, or real-world impact. Those statuses require separate evidence.
