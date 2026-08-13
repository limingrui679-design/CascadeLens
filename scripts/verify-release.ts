import { execFileSync } from "node:child_process";
import { lstat, mkdtemp, open, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import {
  assertContained,
  checksumText,
  inspectTarListing,
  inspectZipArchive,
  parseChecksums,
  safeReleasePath,
  sha256File,
  treeDigest,
} from "./release-utils";

interface ReleaseArtifact {
  file: string;
  bytes: number;
  sha256: string;
}

interface ReleaseManifest {
  schemaVersion: string;
  product: string;
  version: string;
  tag: string;
  commit: string;
  tree: string;
  releaseDate: string;
  packageLockSha256: string;
  generatedArtifactRoots: string[];
  generatedArtifactsSha256: string;
  riskPackCatalogSha256: string;
  productionBuildSha256: string;
  artifacts: ReleaseArtifact[];
}

function run(program: string, args: string[], cwd?: string): string {
  return execFileSync(program, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, CI: "1" },
  });
}

function runVisible(
  program: string,
  args: string[],
  cwd: string,
  environment: Record<string, string> = {},
): void {
  execFileSync(program, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "1", ...environment },
  });
}

function validateArchiveList(listing: string, expectedPrefix: string): string[] {
  const entries = listing.split("\n").filter(Boolean);
  if (entries.length === 0 || entries.length > 20_000) {
    throw new RangeError("Release archive has an invalid number of entries.");
  }
  const unique = new Set<string>();
  for (const path of entries) {
    if (!safeReleasePath.test(path) || !path.startsWith(expectedPrefix)) {
      throw new TypeError(`Unsafe release archive path: ${path}`);
    }
    if (unique.has(path)) throw new TypeError(`Duplicate release archive path: ${path}`);
    unique.add(path);
  }
  return entries;
}

async function hasZipSignature(path: string): Promise<boolean> {
  const handle = await open(path, "r");
  try {
    const header = Buffer.alloc(4);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    return bytesRead === 4 && header[0] === 0x50 && header[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(header[2]) && [0x04, 0x06, 0x08].includes(header[3]);
  } finally {
    await handle.close();
  }
}

async function nestedZipPaths(root: string, directory = root): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = resolve(directory, entry.name);
    assertContained(root, target);
    if (entry.isSymbolicLink()) throw new TypeError("Release source contains a symlink.");
    if (entry.isDirectory()) output.push(...await nestedZipPaths(root, target));
    else if (entry.isFile() && (/\.zip$/i.test(entry.name) || await hasZipSignature(target))) {
      output.push(target);
    }
  }
  return output;
}

const argument = process.argv[2];
if (!argument) throw new TypeError("Usage: npm run release:verify -- release/v<semantic-version>");
const releaseRoot = resolve(argument);
const releaseInfo = await lstat(releaseRoot);
if (!releaseInfo.isDirectory() || releaseInfo.isSymbolicLink()) {
  throw new TypeError("Release path must be a regular directory.");
}
const manifest = JSON.parse(
  await readFile(resolve(releaseRoot, "release-manifest.json"), "utf8"),
) as ReleaseManifest;
if (manifest.schemaVersion !== "cascadelens-release-manifest/1.1") {
  throw new Error("Unsupported release manifest schema.");
}
if (manifest.tag !== `v${manifest.version}` || manifest.product !== "cascadelens") {
  throw new Error("Release identity is inconsistent.");
}
if (
  !/^[a-f0-9]{40}$/.test(manifest.commit) ||
  !/^[a-f0-9]{40}$/.test(manifest.tree) ||
  !/^[a-f0-9]{64}$/.test(manifest.productionBuildSha256) ||
  !Number.isFinite(Date.parse(manifest.releaseDate))
) {
  throw new Error("Release source or production-build identity is invalid.");
}
const checksumsPath = resolve(releaseRoot, "checksums.sha256");
const checksumSource = await readFile(checksumsPath, "utf8");
const checksums = parseChecksums(checksumSource);
if (checksumText(checksums) !== checksumSource) throw new Error("Release checksums are not canonical.");
const expectedChecksumFiles = [
  `cascadelens-${manifest.version}.sbom.cdx.json`,
  `cascadelens-${manifest.version}.tar.gz`,
  `cascadelens-${manifest.version}.zip`,
  "release-manifest.json",
].sort();
if (JSON.stringify(Object.keys(checksums).sort()) !== JSON.stringify(expectedChecksumFiles)) {
  throw new Error("Release checksum file set is incomplete or contains unexpected entries.");
}
for (const [name, expected] of Object.entries(checksums)) {
  const target = resolve(releaseRoot, name);
  assertContained(releaseRoot, target);
  const info = await lstat(target);
  if (!info.isFile() || info.isSymbolicLink()) throw new TypeError(`Unsafe release artifact: ${name}`);
  if (await sha256File(target) !== expected) throw new Error(`Release checksum mismatch: ${name}`);
}
for (const artifact of manifest.artifacts) {
  if (!safeReleasePath.test(artifact.file)) throw new TypeError(`Unsafe manifest artifact: ${artifact.file}`);
  const target = resolve(releaseRoot, artifact.file);
  const content = await readFile(target);
  if (content.byteLength !== artifact.bytes || await sha256File(target) !== artifact.sha256) {
    throw new Error(`Release manifest mismatch: ${artifact.file}`);
  }
}
const archivePath = resolve(releaseRoot, `cascadelens-${manifest.version}.tar.gz`);
const zipPath = resolve(releaseRoot, `cascadelens-${manifest.version}.zip`);
const expectedPrefix = `cascadelens-${manifest.version}/`;
const tarEntries = validateArchiveList(run("tar", ["-tzf", archivePath]), expectedPrefix);
validateArchiveList(run("unzip", ["-Z1", zipPath]), expectedPrefix);
const verboseTar = run("tar", ["-tvzf", archivePath]).split("\n").filter(Boolean);
if (verboseTar.length !== tarEntries.length || verboseTar.some((line) => !/^[d-]/.test(line))) {
  throw new TypeError("Release archive contains a link or unsupported entry type.");
}
inspectZipArchive(await readFile(zipPath));
inspectTarListing(
  verboseTar.join("\n"),
  (await lstat(archivePath)).size,
);

const temporaryRoot = await mkdtemp(join(tmpdir(), "cascadelens-release-verify-"));
try {
  run("tar", ["-xzf", archivePath, "-C", temporaryRoot]);
  const sourceRoot = resolve(temporaryRoot, expectedPrefix.slice(0, -1));
  assertContained(temporaryRoot, sourceRoot);
  const nestedArchives = await nestedZipPaths(sourceRoot);
  if (nestedArchives.length > 100) {
    throw new RangeError("Release contains too many embedded archives.");
  }
  let nestedArchiveBytes = 0;
  for (const nestedArchive of nestedArchives) {
    const info = await lstat(nestedArchive);
    nestedArchiveBytes += info.size;
    if (nestedArchiveBytes > 250 * 1024 * 1024) {
      throw new RangeError("Embedded archive byte budget exceeded.");
    }
    inspectZipArchive(await readFile(nestedArchive), undefined, true);
  }
  const packageMetadata = JSON.parse(
    await readFile(resolve(sourceRoot, "package.json"), "utf8"),
  ) as { name: string; version: string };
  if (packageMetadata.name !== manifest.product || packageMetadata.version !== manifest.version) {
    throw new Error("Extracted package identity does not match the release manifest.");
  }
  if (await sha256File(resolve(sourceRoot, "package-lock.json")) !== manifest.packageLockSha256) {
    throw new Error("Extracted package lock does not match the release manifest.");
  }
  const bundledSbom = resolve(sourceRoot, "docs/release/sbom.cdx.json");
  const detachedSbom = resolve(releaseRoot, `cascadelens-${manifest.version}.sbom.cdx.json`);
  if (await sha256File(bundledSbom) !== await sha256File(detachedSbom)) {
    throw new Error("Bundled and detached SBOM files differ.");
  }
  const before = await treeDigest(sourceRoot, manifest.generatedArtifactRoots);
  if (before !== manifest.generatedArtifactsSha256) {
    throw new Error("Extracted generated artifacts do not match the release manifest.");
  }
  if (await sha256File(resolve(sourceRoot, "public/riskpacks/catalog.json")) !== manifest.riskPackCatalogSha256) {
    throw new Error("Extracted RiskPack catalog does not match the release manifest.");
  }
  const buildEnvironment = {
    CASCADELENS_BUILD_COMMIT: manifest.commit,
    CASCADELENS_BUILD_TREE: manifest.tree,
    CASCADELENS_BUILD_TAG: manifest.tag,
    CASCADELENS_BUILD_DIRTY: "false",
    CASCADELENS_BUILD_TIME: manifest.releaseDate,
  };
  runVisible("npm", ["ci", "--no-audit", "--no-fund"], sourceRoot);
  runVisible("npm", ["run", "generate:catalog"], sourceRoot);
  runVisible("npm", ["run", "generate:cases"], sourceRoot);
  runVisible("npm", ["run", "generate:riskpack-archives"], sourceRoot);
  runVisible("npm", ["run", "generate:sbom"], sourceRoot);
  const after = await treeDigest(sourceRoot, manifest.generatedArtifactRoots);
  if (after !== before) throw new Error("Generated artifacts changed during fresh rebuild.");
  runVisible("npm", ["run", "ci"], sourceRoot, buildEnvironment);
  if (await treeDigest(sourceRoot, ["dist"]) !== manifest.productionBuildSha256) {
    throw new Error("Fresh production build does not match the release manifest.");
  }
  runVisible(
    "npm",
    ["run", "verify:build-reproducibility"],
    sourceRoot,
    buildEnvironment,
  );
  const reproducedBuildSha256 = await treeDigest(sourceRoot, ["dist"]);
  if (reproducedBuildSha256 !== manifest.productionBuildSha256) {
    throw new Error("Offline repeated build does not match the tagged production build.");
  }

  const report = {
    schemaVersion: "cascadelens-release-verification/1.0",
    releaseTag: manifest.tag,
    commit: manifest.commit,
    verifiedAt: new Date().toISOString(),
    reviewer: "automated_local_fresh_archive_verifier",
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      npm: run("npm", ["--version"]).trim(),
    },
    checks: {
      canonicalRelativeChecksums: "pass",
      safeArchivePathsAndTypes: "pass",
      archiveExpansionAndNestedBudgets: "pass",
      exactManifestIdentity: "pass",
      detachedSbomMatchesArchive: "pass",
      cleanInstallWithoutGit: "pass",
      deterministicGeneratedArtifacts: "pass",
      byteReproducibleOfflineProductionBuild: "pass",
      fullCi: "pass",
    },
    generatedArtifactsSha256: after,
    productionBuildSha256: reproducedBuildSha256,
    evidenceBoundary:
      "This verifies release integrity and software behavior only; it is not external review or empirical model validation.",
  };
  const reportPath = resolve(releaseRoot, "verification-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(
    resolve(releaseRoot, "verification-report.sha256"),
    checksumText({ [basename(reportPath)]: await sha256File(reportPath) }),
    "utf8",
  );
  console.log(`Verified ${manifest.tag} from a fresh archive without .git.`);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
