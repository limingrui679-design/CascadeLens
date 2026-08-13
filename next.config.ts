import type { NextConfig } from "next";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const excludedIdentityDirectories = new Set([
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

function archiveSourceDigest(root: string): string {
  const files: string[] = [];
  function visit(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && excludedIdentityDirectories.has(entry.name)) continue;
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

const sourceIdentity =
  process.env.CASCADELENS_BUILD_TREE ??
  gitTree() ??
  archiveSourceDigest(process.cwd());
const deterministicBuildId =
  process.env.CASCADELENS_BUILD_ID ??
  createHash("sha256")
    .update(`cascadelens-build\0${sourceIdentity}`)
    .digest("hex")
    .slice(0, 32);
process.env.__VINEXT_SHARED_REVALIDATE_SECRET ??= createHash("sha256")
  .update(`cascadelens-no-on-demand-revalidation\0${deterministicBuildId}`)
  .digest("hex");

const securityHeaders = [
  { key: "Content-Security-Policy", value: "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'; style-src-attr 'none'; upgrade-insecure-requests" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
] as const;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  generateBuildId: async () => deterministicBuildId,
  async headers() {
    return [{ source: "/:path*", headers: [...securityHeaders] }];
  },
};

export default nextConfig;
