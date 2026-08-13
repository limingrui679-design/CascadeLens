import vinext from "vinext";
import { defineConfig } from "vite";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };
import packageMetadata from "./package.json" with { type: "json" };
import { sites } from "./scripts/sites-vite-plugin.ts";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

function sha256(path: string): string {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

function git(args: string[]): string | undefined {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

function buildIdentity() {
  const repositoryCommit = process.env.CASCADELENS_BUILD_COMMIT ?? git(["rev-parse", "HEAD"]);
  const repositoryTree = process.env.CASCADELENS_BUILD_TREE ?? git(["rev-parse", "HEAD^{tree}"]);
  const releaseTag = process.env.CASCADELENS_BUILD_TAG ?? git(["describe", "--tags", "--exact-match", "HEAD"]);
  const gitDirty = git(["status", "--porcelain=v1", "--untracked-files=all"]);
  const commit = repositoryCommit ?? "source-archive-unbound";
  return {
    schemaVersion: "cascadelens-build-info/1.0",
    project: "CascadeLens",
    repository: "https://github.com/limingrui679-design/CascadeLens",
    commit,
    tree: repositoryTree ?? "source-archive-unbound",
    releaseTag: releaseTag ?? null,
    dirty:
      process.env.CASCADELENS_BUILD_DIRTY !== undefined
        ? process.env.CASCADELENS_BUILD_DIRTY === "true"
        : gitDirty !== undefined
          ? gitDirty !== ""
          : false,
    sourceIdentity: repositoryCommit ? "git_commit" : "archive_unbound",
    packageVersion: packageMetadata.version,
    builtAt:
      process.env.CASCADELENS_BUILD_TIME ??
      new Date().toISOString(),
    packageLockSha256: sha256("package-lock.json"),
    contentCatalogSha256: sha256("content/cases/catalog.json"),
    riskPackCatalogSha256: sha256("public/riskpacks/catalog.json"),
    hostingProjectId: hostingConfig.project_id,
    evidenceBoundary:
      "Self-reported build identity for reproducibility; not a third-party signature, adoption record, or empirical validation.",
  };
}

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      __CASCADELENS_BUILD_INFO__: JSON.stringify(buildIdentity()),
    },
    server: isCodexSeatbeltSandbox
      ? { watch: { useFsEvents: false, usePolling: true } }
      : undefined,
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
