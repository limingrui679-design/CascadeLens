import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = process.cwd();
const entropyGuard = resolve(root, "scripts/deterministic-build-entropy.mjs");
const networkGuard = resolve(root, "scripts/offline-network-guard.mjs");

function node(
  source: string,
  preloaders: string[],
): string {
  return execFileSync(
    process.execPath,
    preloaders.flatMap((path) => ["--import", path]).concat(["-e", source]),
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        CASCADELENS_DETERMINISTIC_BUILD_SEED: "reproducibility-test-seed",
      },
    },
  );
}

test("build-only entropy is stable for one source identity", () => {
  const source = `
    const crypto = require("node:crypto");
    process.stdout.write(crypto.randomBytes(32).toString("hex") + "\\n");
    process.stdout.write(crypto.randomUUID() + "\\n");
  `;
  assert.equal(node(source, [entropyGuard]), node(source, [entropyGuard]));
});

test("offline build guard rejects external network and permits loopback", () => {
  const source = `
    fetch("https://example.com").then(
      () => process.exit(2),
      error => {
        if (error.code !== "ENETUNREACH") throw error;
        process.stdout.write("blocked\\n");
      },
    );
  `;
  assert.equal(node(source, [entropyGuard, networkGuard]), "blocked\n");
});

test("production fonts are repository-local and have no Google build import", async () => {
  const layout = await readFile(resolve(root, "app/layout.tsx"), "utf8");
  assert.doesNotMatch(layout, /next\/font\/google/);
  await Promise.all([
    access(resolve(root, "public/fonts/geist-latin-variable.woff2")),
    access(resolve(root, "public/fonts/geist-mono-latin-variable.woff2")),
    access(resolve(root, "public/fonts/OFL.txt")),
  ]);
});
