import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import {
  checksumText,
  safeReleasePath,
  sha256File,
  treeDigest,
} from "./release-utils";

interface PackageMetadata {
  name: string;
  version: string;
  releaseDate: string;
  engines: { node: string };
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const tag = process.argv[2];
if (!tag || !/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new TypeError("Usage: npm run release:prepare -- v<semantic-version>");
}
const repoRoot = resolve(git("rev-parse", "--show-toplevel"));
if (repoRoot !== resolve(process.cwd())) throw new Error("Run release preparation from the repository root.");
const packageMetadata = JSON.parse(
  await readFile(resolve(repoRoot, "package.json"), "utf8"),
) as PackageMetadata;
if (tag !== `v${packageMetadata.version}`) {
  throw new Error(`Tag ${tag} does not match package version ${packageMetadata.version}.`);
}
if (git("status", "--porcelain=v1", "--untracked-files=all") !== "") {
  throw new Error("Release preparation requires a clean working tree.");
}
if (git("cat-file", "-t", tag) !== "tag") {
  throw new Error(`${tag} must be an annotated tag.`);
}
const commit = git("rev-parse", `${tag}^{commit}`);
const head = git("rev-parse", "HEAD");
if (commit !== head) throw new Error(`${tag} does not point to the current HEAD.`);
if (git("ls-tree", "-r", tag).split("\n").some((line) => /^120000 /.test(line))) {
  throw new Error("Release tags may not contain symbolic links.");
}

const outputRoot = resolve(repoRoot, "release", tag);
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const prefix = `${packageMetadata.name}-${packageMetadata.version}/`;
const tarPath = resolve(outputRoot, `${packageMetadata.name}-${packageMetadata.version}.tar`);
const tarGzipPath = `${tarPath}.gz`;
const zipPath = resolve(outputRoot, `${packageMetadata.name}-${packageMetadata.version}.zip`);
execFileSync("git", ["archive", "--format=tar", `--prefix=${prefix}`, `--output=${tarPath}`, tag]);
const compressedTar = gzipSync(await readFile(tarPath), { level: 9 });
compressedTar.fill(0, 4, 8); // Normalize the gzip MTIME field for byte-identical releases.
await writeFile(tarGzipPath, compressedTar);
await rm(tarPath);
execFileSync("git", ["archive", "--format=zip", `--prefix=${prefix}`, `--output=${zipPath}`, tag]);

const sbomSource = resolve(repoRoot, "docs/release/sbom.cdx.json");
const sbomName = `${packageMetadata.name}-${packageMetadata.version}.sbom.cdx.json`;
const sbomPath = resolve(outputRoot, sbomName);
await writeFile(sbomPath, await readFile(sbomSource));
const generatedRoots = [
  "content/catalog",
  "content/cases",
  "content/snapshots",
  "public/riskpacks",
  "docs/release/sbom.cdx.json",
];
const tree = git("rev-parse", `${tag}^{tree}`);
const productionBuildSha256 = await treeDigest(repoRoot, ["dist"]);
const workerPath = resolve(repoRoot, "dist/server/index.js");
const workerUrl = pathToFileURL(workerPath);
workerUrl.searchParams.set("release-prepare", commit);
const worker = await import(workerUrl.href).then((module) => module.default as {
  fetch(request: Request, env: unknown, context: unknown): Promise<Response>;
});
const buildInfoResponse = await worker.fetch(
  new Request("http://localhost/build-info.json"),
  {},
  { waitUntil() {}, passThroughOnException() {} },
);
const buildInfo = await buildInfoResponse.json() as Record<string, unknown>;
if (
  buildInfoResponse.status !== 200 ||
  buildInfo.commit !== commit ||
  buildInfo.tree !== tree ||
  buildInfo.releaseTag !== tag ||
  buildInfo.dirty !== false ||
  buildInfo.packageVersion !== packageMetadata.version
) {
  throw new Error("dist does not identify the clean tagged release being prepared.");
}
const artifacts = await Promise.all(
  [tarGzipPath, zipPath, sbomPath].map(async (path) => ({
    file: basename(path),
    bytes: (await readFile(path)).byteLength,
    sha256: await sha256File(path),
  })),
);
const manifest = {
  schemaVersion: "cascadelens-release-manifest/1.1",
  product: packageMetadata.name,
  version: packageMetadata.version,
  tag,
  tagObject: git("rev-parse", tag),
  commit,
  tree,
  releaseDate: new Date(packageMetadata.releaseDate).toISOString(),
  nodeEngine: packageMetadata.engines.node,
  packageLockSha256: await sha256File(resolve(repoRoot, "package-lock.json")),
  generatedArtifactRoots: generatedRoots,
  generatedArtifactsSha256: await treeDigest(repoRoot, generatedRoots),
  riskPackCatalogSha256: await sha256File(resolve(repoRoot, "public/riskpacks/catalog.json")),
  productionBuildSha256,
  artifacts,
  evidenceBoundary:
    "Software verification and public hosting do not establish empirical model validity, external review, adoption, or real-world impact.",
};
const manifestName = "release-manifest.json";
const manifestPath = resolve(outputRoot, manifestName);
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

const checksums: Record<string, string> = Object.create(null) as Record<string, string>;
for (const path of [tarGzipPath, zipPath, sbomPath, manifestPath]) {
  const name = basename(path);
  if (!safeReleasePath.test(name)) throw new TypeError(`Unsafe release filename: ${name}`);
  checksums[name] = await sha256File(path);
}
await writeFile(resolve(outputRoot, "checksums.sha256"), checksumText(checksums), "utf8");
console.log(`Prepared ${tag} from ${commit}.`);
console.log(`Release directory: ${outputRoot}`);
