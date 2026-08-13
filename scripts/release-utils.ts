import { createHash } from "node:crypto";
import { lstat, readdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

export const safeReleasePath = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/[\]-]+$/;

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
  for (const path of files.sort((left, right) => relative(root, left).localeCompare(relative(root, right)))) {
    hash.update(relative(root, path).split(sep).join("/"));
    hash.update("\0");
    hash.update(await readFile(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function checksumText(checksums: Record<string, string>): string {
  return Object.entries(checksums)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, digest]) => `${digest}  ${path}`)
    .join("\n") + "\n";
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
