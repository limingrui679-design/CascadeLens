# Release process

1. Regenerate the connector catalog, twelve cases, and deterministic RiskPack archives.
2. Run `npm run ci` from the working tree.
3. Generate the CycloneDX SBOM with `npm run generate:sbom`.
4. Commit the exact tree and tag it with an annotated semantic version.
5. Run `npm run release:prepare -- vX.Y.Z` to create a clean source archive, manifest, and relative checksum file from the tag.
6. Run `npm run release:verify -- release/vX.Y.Z`. It inspects ZIP/TAR entry, expansion, compression-ratio, path, type, duplicate, and nested-archive budgets before extraction; then it extracts without `.git`, runs `npm ci`, regenerates deterministic artifacts, executes full CI, and compares committed generated artifacts.
7. Build and host only the verified tagged tree. Reopen the public URL and compare `/build-info.json` commit, `dirty=false`, package version, lock digest, content/RiskPack catalog digests, route responses, security headers, and downloads with the release.
8. Publish the archive, checksum, manifest, SBOM, detached verification receipt, and annotated tag only after every step passes.

Integrity, tests, and hosting do not establish empirical model validity, external review, adoption, or real-world impact. Those statuses require separate evidence.
