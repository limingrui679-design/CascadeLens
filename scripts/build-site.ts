import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { cleanBuildOutputs } from "./build-clean";

const excludedDirectories = new Set([
  ".git",
  ".next",
  ".vinext",
  ".wrangler",
  "dist",
  "node_modules",
  "outputs",
  "release",
  "work",
]);

function gitTree(): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "HEAD^{tree}"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function sourceDigest(root: string): string {
  const files: string[] = [];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  visit(root);
  const hash = createHash("sha256");
  for (const path of files.sort()) {
    hash.update(relative(root, path).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

const root = process.cwd();
const offline = process.argv.includes("--offline");
const seed =
  process.env.CASCADELENS_DETERMINISTIC_BUILD_SEED ??
  process.env.CASCADELENS_BUILD_TREE ??
  gitTree() ??
  sourceDigest(root);
const preloaders = [
  resolve(root, "scripts/deterministic-build-entropy.mjs"),
  ...(offline ? [resolve(root, "scripts/offline-network-guard.mjs")] : []),
];
const nodeOptions = [
  process.env.NODE_OPTIONS,
  ...preloaders.map((path) => `--import=${pathToFileURL(path).href}`),
]
  .filter(Boolean)
  .join(" ");

// Vite/vinext do not guarantee removal of files that disappeared between
// builds. Start from empty output roots so a release digest cannot bind stale
// assets left by an earlier checkout or build configuration.
cleanBuildOutputs(root);

execFileSync(
  process.execPath,
  [resolve(root, "node_modules/vinext/dist/cli.js"), "build"],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      CASCADELENS_DETERMINISTIC_BUILD_SEED: seed,
      CASCADELENS_OFFLINE_BUILD: offline ? "1" : "0",
      MINIFLARE_REGISTRY_PATH: ".wrangler/registry",
      NODE_OPTIONS: nodeOptions,
      WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
      WRANGLER_WRITE_LOGS: "false",
    },
  },
);
