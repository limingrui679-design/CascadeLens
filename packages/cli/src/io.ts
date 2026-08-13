import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { RiskPack, RiskPackManifest } from "../../core/src/index";

const safeRelativePath = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[a-zA-Z0-9._/-]+$/;
const sha256 = /^[a-f0-9]{64}$/;

export async function readBoundedText(path: string, maximumBytes: number): Promise<string> {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new TypeError(`Expected a regular non-symbolic file: ${path}`);
  }
  if (info.size > maximumBytes) {
    throw new RangeError(`${path} exceeds the ${maximumBytes}-byte safety limit.`);
  }
  return readFile(path, "utf8");
}

export function assertSafeJson(value: unknown, label: string): void {
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let visited = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    visited += 1;
    if (visited > 500_000) throw new RangeError(`${label} has too many values.`);
    if (current.depth > 64) throw new RangeError(`${label} exceeds the nesting-depth limit.`);
    if (!current.value || typeof current.value !== "object") continue;
    for (const [key, child] of Object.entries(current.value as Record<string, unknown>)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) {
        throw new TypeError(`${label} contains unsafe key ${key}.`);
      }
      stack.push({ value: child, depth: current.depth + 1 });
    }
  }
}

export async function readJson<T>(
  path: string,
  maximumBytes: number,
  label = basename(path),
): Promise<T> {
  const value = JSON.parse(await readBoundedText(path, maximumBytes)) as unknown;
  assertSafeJson(value, label);
  return value as T;
}

function ensureContained(root: string, target: string): void {
  const offset = relative(root, target);
  if (offset === "" || (!offset.startsWith(`..${sep}`) && offset !== ".." && !isAbsolute(offset))) {
    return;
  }
  throw new TypeError(`RiskPack path escapes its root: ${target}`);
}

async function readPackFile(root: string, path: string): Promise<string> {
  if (!safeRelativePath.test(path)) throw new TypeError(`Unsafe RiskPack path: ${path}`);
  const rootReal = await realpath(root);
  const target = resolve(root, path);
  ensureContained(resolve(root), target);
  const targetReal = await realpath(target);
  ensureContained(rootReal, targetReal);
  return readBoundedText(targetReal, 100_000_000);
}

function parseChecksums(text: string): Record<string, string> {
  const checksums: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const [index, line] of text.split("\n").entries()) {
    if (line === "") continue;
    const match = /^([a-f0-9]{64}) {2}([a-zA-Z0-9._/-]+)$/.exec(line);
    if (!match || !safeRelativePath.test(match[2])) {
      throw new TypeError(`Invalid checksum line ${index + 1}.`);
    }
    if (checksums[match[2]]) throw new TypeError(`Duplicate checksum path ${match[2]}.`);
    checksums[match[2]] = match[1];
  }
  return checksums;
}

export async function readRiskPackDirectory(root: string): Promise<RiskPack> {
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new TypeError(`Expected a regular RiskPack directory: ${root}`);
  }
  const manifestText = await readPackFile(root, "manifest.json");
  const manifest = JSON.parse(manifestText) as RiskPackManifest;
  assertSafeJson(manifest, "RiskPack manifest");
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.files)) {
    throw new TypeError("RiskPack manifest is missing a files array.");
  }
  if (manifest.files.some((path) => typeof path !== "string")) {
    throw new TypeError("RiskPack manifest paths must be strings.");
  }
  if (manifest.files.length > 100) throw new RangeError("RiskPack declares more than 100 files.");
  const declared = ["manifest.json", ...manifest.files];
  if (new Set(declared).size !== declared.length) {
    throw new TypeError("RiskPack manifest contains duplicate paths.");
  }
  const files: Record<string, string> = Object.create(null) as Record<string, string>;
  for (const path of declared) files[path] = await readPackFile(root, path);
  files["checksums.sha256"] = await readPackFile(root, "checksums.sha256");
  const checksums = parseChecksums(files["checksums.sha256"]);
  for (const digest of Object.values(checksums)) {
    if (!sha256.test(digest)) throw new TypeError("Invalid SHA-256 digest in checksum file.");
  }
  return { manifest, files, checksums };
}

async function writeAtomicFile(path: string, content: string): Promise<void> {
  const parent = dirname(path);
  await mkdir(parent, { recursive: true });
  try {
    await lstat(path);
    throw new Error(`Output already exists: ${path}`);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
  const temporary = join(parent, `.${basename(path)}.${process.pid}.tmp`);
  await writeFile(temporary, content, { encoding: "utf8", flag: "wx" });
  await rename(temporary, path);
}

export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await writeAtomicFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeRiskPackDirectory(root: string, pack: RiskPack): Promise<void> {
  const parent = dirname(resolve(root));
  await mkdir(parent, { recursive: true });
  try {
    await lstat(root);
    throw new Error(`Output already exists: ${root}`);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
  const temporary = await mkdtemp(join(parent, `.${basename(root)}.tmp-`));
  try {
    for (const [path, content] of Object.entries(pack.files)) {
      if (!safeRelativePath.test(path)) throw new TypeError(`Unsafe RiskPack path: ${path}`);
      const target = resolve(temporary, path);
      ensureContained(temporary, target);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, content, { encoding: "utf8", flag: "wx" });
    }
    await rename(temporary, root);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
