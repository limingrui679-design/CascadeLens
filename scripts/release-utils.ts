import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { unzipSync } from "fflate";
import { compareCanonicalStrings } from "../packages/core/src/canonical";

export const safeReleasePath = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/()[\]-]+$/;

export async function sha256File(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

export function assertContained(root: string, target: string): void {
  const offset = relative(resolve(root), resolve(target));
  if (
    offset === "" ||
    (!offset.startsWith(`..${sep}`) && offset !== ".." && !offset.startsWith("/"))
  ) {
    return;
  }
  throw new TypeError(`Path escapes release root: ${target}`);
}

async function collectFiles(root: string, directory: string): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = resolve(directory, entry.name);
    assertContained(root, target);
    if (entry.isSymbolicLink()) throw new TypeError(`Release input contains symlink: ${relative(root, target)}`);
    if (entry.isDirectory()) output.push(...await collectFiles(root, target));
    else if (entry.isFile()) output.push(target);
    else throw new TypeError(`Release input contains unsupported entry: ${relative(root, target)}`);
  }
  return output;
}

export async function treeDigest(root: string, relativeRoots: string[]): Promise<string> {
  const hash = createHash("sha256");
  const files: string[] = [];
  for (const path of relativeRoots) {
    if (!safeReleasePath.test(path)) throw new TypeError(`Unsafe digest root: ${path}`);
    const target = resolve(root, path);
    assertContained(root, target);
    const info = await lstat(target);
    if (info.isSymbolicLink()) throw new TypeError(`Digest root is a symlink: ${path}`);
    if (info.isDirectory()) files.push(...await collectFiles(root, target));
    else if (info.isFile()) files.push(target);
    else throw new TypeError(`Unsupported digest root: ${path}`);
  }
  for (const path of files.sort((left, right) =>
    compareCanonicalStrings(relative(root, left), relative(root, right)))) {
    hash.update(relative(root, path).split(sep).join("/"));
    hash.update("\0");
    hash.update(await readFile(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function checksumText(checksums: Record<string, string>): string {
  return Object.entries(checksums)
    .sort(([left], [right]) => compareCanonicalStrings(left, right))
    .map(([path, digest]) => `${digest}  ${path}`)
    .join("\n") + "\n";
}

export interface ArchiveBudgets {
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalExpandedBytes: number;
  maxCompressionRatio: number;
}

export const releaseArchiveBudgets: ArchiveBudgets = {
  maxEntries: 20_000,
  maxEntryBytes: 100 * 1024 * 1024,
  maxTotalExpandedBytes: 1024 * 1024 * 1024,
  maxCompressionRatio: 200,
};

export function inspectZipArchive(
  bytes: Uint8Array,
  budgets: ArchiveBudgets = releaseArchiveBudgets,
  rejectNestedArchives = false,
): { entries: number; totalExpandedBytes: number; maximumCompressionRatio: number } {
  let entries = 0;
  let totalExpandedBytes = 0;
  let maximumCompressionRatio = 0;
  const paths = new Set<string>();
  unzipSync(bytes, {
    filter(info) {
      entries += 1;
      if (entries > budgets.maxEntries) throw new RangeError("ZIP entry budget exceeded.");
      if (!safeReleasePath.test(info.name)) throw new TypeError(`Unsafe ZIP path: ${info.name}`);
      if (paths.has(info.name)) throw new TypeError(`Duplicate ZIP path: ${info.name}`);
      paths.add(info.name);
      if (
        rejectNestedArchives &&
        /\.(?:zip|tar|tgz|tar\.gz|7z|rar)$/i.test(info.name)
      ) {
        throw new TypeError(`Nested archive depth exceeds the release budget: ${info.name}`);
      }
      if (info.originalSize > budgets.maxEntryBytes) {
        throw new RangeError(`ZIP entry expansion budget exceeded: ${info.name}`);
      }
      totalExpandedBytes += info.originalSize;
      if (totalExpandedBytes > budgets.maxTotalExpandedBytes) {
        throw new RangeError("ZIP total expansion budget exceeded.");
      }
      const ratio = info.originalSize / Math.max(1, info.size);
      maximumCompressionRatio = Math.max(maximumCompressionRatio, ratio);
      if (ratio > budgets.maxCompressionRatio) {
        throw new RangeError(`ZIP compression ratio budget exceeded: ${info.name}`);
      }
      return false;
    },
  });
  return { entries, totalExpandedBytes, maximumCompressionRatio };
}

export function inspectTarListing(
  listing: string,
  compressedBytes: number,
  budgets: ArchiveBudgets = releaseArchiveBudgets,
): { entries: number; totalExpandedBytes: number; overallCompressionRatio: number } {
  const lines = listing.split("\n").filter(Boolean);
  if (lines.length === 0 || lines.length > budgets.maxEntries) {
    throw new RangeError("TAR entry budget exceeded.");
  }
  let totalExpandedBytes = 0;
  for (const line of lines) {
    const match = /^[d-]\S*\s+\d+\s+\S+\s+\S+\s+(\d+)\s+/.exec(line);
    if (!match) throw new TypeError(`Unsupported TAR metadata: ${line}`);
    const size = Number(match[1]);
    if (!Number.isSafeInteger(size) || size < 0 || size > budgets.maxEntryBytes) {
      throw new RangeError("TAR entry expansion budget exceeded.");
    }
    totalExpandedBytes += size;
    if (totalExpandedBytes > budgets.maxTotalExpandedBytes) {
      throw new RangeError("TAR total expansion budget exceeded.");
    }
  }
  const overallCompressionRatio = totalExpandedBytes / Math.max(1, compressedBytes);
  if (overallCompressionRatio > budgets.maxCompressionRatio) {
    throw new RangeError("TAR compression ratio budget exceeded.");
  }
  return { entries: lines.length, totalExpandedBytes, overallCompressionRatio };
}

export function parseChecksums(text: string): Record<string, string> {
  const checksums: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [index, line] of text.split("\n").entries()) {
    if (line === "") continue;
    const match = /^([a-f0-9]{64}) {2}([a-zA-Z0-9._/-]+)$/.exec(line);
    if (!match || !safeReleasePath.test(match[2])) {
      throw new TypeError(`Invalid release checksum line ${index + 1}.`);
    }
    if (checksums[match[2]]) throw new TypeError(`Duplicate release checksum path: ${match[2]}`);
    checksums[match[2]] = match[1];
  }
  return checksums;
}
