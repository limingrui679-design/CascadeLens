# Release process

1. Regenerate the connector catalog, twelve cases, deterministic RiskPack archives, and CycloneDX SBOM.
2. Run `npm run ci` and `npm run verify:build-reproducibility` from the working tree. The latter performs two network-blocked production builds and requires identical complete `dist` tree digests.
3. Commit the exact tree, push it, and require the Linux/macOS reproducible-build matrix plus the complete CI job to pass.
4. Create an annotated semantic-version tag on that exact commit.
5. Rebuild the clean tagged tree with `npm run verify:build-reproducibility`, then run `npm run release:prepare -- vX.Y.Z`. The release manifest binds the commit, Git tree, package version, release date, and exact production `dist` digest to the source archives, SBOM, and checksums.
6. Run `npm run release:verify -- release/vX.Y.Z`. It inspects ZIP/TAR entry, expansion, compression-ratio, path, type, duplicate, and nested-archive budgets before extraction; then it extracts without `.git`, runs `npm ci`, regenerates deterministic artifacts, executes full CI, performs two additional offline builds, and requires the rebuilt `dist` digest to match the manifest.
7. Confirm repository-level immutable releases are enabled. Create the GitHub Release as a draft, attach the archive, checksum, manifest, SBOM, detached verification receipt, and annotated tag only after every gate passes, then publish the complete draft once so GitHub locks its tag, commit binding, assets, and release attestation.
8. Host only the verified tagged build. Reopen the public URL and compare `/build-info.json` commit, tree, tag, `dirty=false`, package version, lock/content/RiskPack digests, route responses, strict CSP, local-font delivery, and downloads with the release.

Integrity, tests, and hosting do not establish empirical model validity, external review, adoption, or real-world impact. Those statuses require separate evidence.
