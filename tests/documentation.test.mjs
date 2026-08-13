import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { imageSize } from "image-size";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const documentationFiles = [
  "README.md",
  "docs/README.md",
  "packages/README.md",
  "content/README.md",
  "examples/README.md",
];
const screenshotPaths = [
  "docs/assets/readme/overview.jpg",
  "docs/assets/readme/workbench.jpg",
  "docs/assets/readme/worldgraph.jpg",
  "docs/assets/readme/cases.jpg",
];

function localTargets(markdown) {
  const targets = new Set();
  const markdownLink = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const htmlLink = /<(?:a|img)\b[^>]*?\b(?:href|src)="([^"]+)"[^>]*>/gi;
  for (const pattern of [markdownLink, htmlLink]) {
    for (const match of markdown.matchAll(pattern)) targets.add(match[1]);
  }
  return [...targets].filter(
    (target) =>
      !target.startsWith("#") &&
      !target.startsWith("http://") &&
      !target.startsWith("https://") &&
      !target.startsWith("mailto:"),
  );
}

test("documentation navigation has no missing local targets", async () => {
  for (const relativeFile of documentationFiles) {
    const sourcePath = resolve(repositoryRoot, relativeFile);
    const markdown = await readFile(sourcePath, "utf8");
    for (const target of localTargets(markdown)) {
      const withoutFragment = target.split("#", 1)[0].split("?", 1)[0];
      if (!withoutFragment) continue;
      const targetPath = resolve(dirname(sourcePath), decodeURIComponent(withoutFragment));
      let targetStats;
      try {
        targetStats = await stat(targetPath);
      } catch {
        assert.fail(`${relativeFile} references a missing local target: ${target}`);
      }
      if (targetStats.isDirectory()) {
        const entries = await readdir(targetPath);
        assert.ok(
          entries.length > 0,
          `${relativeFile} references an empty directory that Git cannot publish: ${target}`,
        );
      }
    }
  }
});

test("README exposes the runnable path, architecture, and evidence boundary", async () => {
  const readme = await readFile(resolve(repositoryRoot, "README.md"), "utf8");
  assert.match(readme, /https:\/\/cascadelens\.limingrui2\.chatgpt\.site/);
  assert.match(readme, /```mermaid/);
  assert.match(readme, /npm ci/);
  assert.match(readme, /0 historically scored cases/);
  assert.match(readme, /0 external validations/);
  assert.match(readme, /0 claims of organizational adoption/);
});

test("README screenshots are committed, valid, and consistently framed", async () => {
  for (const relativePath of screenshotPaths) {
    const bytes = await readFile(resolve(repositoryRoot, relativePath));
    assert.deepEqual(imageSize(bytes), {
      width: 1440,
      height: 900,
      type: "jpg",
    });
  }
});
