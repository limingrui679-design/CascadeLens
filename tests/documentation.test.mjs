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

test("README exposes the Python one-line install before the case library", async () => {
  const readme = await readFile(resolve(repositoryRoot, "README.md"), "utf8");
  const install = readme.indexOf('pip install "cascadelens @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.5.1"');
  const cases = readme.indexOf("## Explore all 12 cases");
  assert.ok(install >= 0, "README must contain the stable one-line Python install");
  assert.ok(cases > install, "Python installation must appear before the twelve-case showcase");
  assert.match(readme, /CSV · GraphML · NetworkX/);
  assert.match(readme, /cascadelens demo --out demo-riskpack/);
  const pyproject = await readFile(resolve(repositoryRoot, "pyproject.toml"), "utf8");
  assert.match(pyproject, /cascadelens = "cascadelens\.cli:main"/);
  assert.match(pyproject, /requires-python = ">=3\.11"/);
});

test("README introduction explains the analytical input, outputs, and proof path", async () => {
  const readme = await readFile(resolve(repositoryRoot, "README.md"), "utf8");
  const introduction = readme.slice(0, readme.indexOf("<table>"));
  assert.match(introduction, /WorldGraph snapshot/);
  assert.match(introduction, /frozen decision cutoff/);
  assert.match(introduction, /lower, central, and upper impacts/);
  assert.match(introduction, /feasible Pareto trade-offs/);
  assert.match(introduction, /returns `scenario_only`/);
  assert.match(introduction, /RiskPack whose metadata and analytical outputs are recomputed/);
});

test("README prominently links every reference case", async () => {
  const [readme, caseCatalog] = await Promise.all([
    readFile(resolve(repositoryRoot, "README.md"), "utf8"),
    readFile(resolve(repositoryRoot, "content/cases/catalog.json"), "utf8").then(JSON.parse),
  ]);
  assert.equal(caseCatalog.cases.length, 12);
  const showcaseStart = readme.indexOf("## Explore all 12 cases");
  const nextSection = readme.indexOf("\n## Why CascadeLens", showcaseStart);
  assert.ok(showcaseStart >= 0, "README must contain the twelve-case showcase");
  assert.ok(nextSection > showcaseStart, "twelve-case showcase must appear before project rationale");
  const showcase = readme.slice(showcaseStart, nextSection);
  for (const item of caseCatalog.cases) {
    assert.match(showcase, new RegExp(`content/cases/${item.slug}/README\\.md`));
    assert.match(showcase, new RegExp(item.shortTitle.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&"), "i"));
  }
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

test("package dependency map matches the core parser boundary", async () => {
  const packageMap = await readFile(resolve(repositoryRoot, "packages/README.md"), "utf8");
  const shockParser = await readFile(
    resolve(repositoryRoot, "packages/core/src/shockscript.ts"),
    "utf8",
  );
  assert.match(shockParser, /from ["']yaml["']/);
  assert.match(packageMap, /Node\.js standard library plus the audited YAML parser/);
  assert.doesNotMatch(packageMap, /core[^\n]*Node\.js standard library only/i);
});

test("human data catalog matches the four redistributable machine descriptors", async () => {
  const catalog = JSON.parse(
    await readFile(resolve(repositoryRoot, "content/catalog/connectors.json"), "utf8"),
  );
  const documentation = await readFile(
    resolve(repositoryRoot, "docs/connectors/DATA_CATALOG.md"),
    "utf8",
  );
  const expectedIds = ["bea-input-output", "faostat", "gleif", "openfda-drug-shortages"];
  const redistributable = catalog.connectors.filter(
    (item) => item.redistributionMode === "redistributable" && item.rawRedistributable,
  );
  assert.deepEqual(redistributable.map((item) => item.id).sort(), expectedIds);
  for (const item of redistributable) {
    assert.match(documentation, new RegExp(item.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
    assert.match(documentation, new RegExp(`${item.checkedAt}[^\n]*redistributable`, "i"));
    assert.ok(item.redistributionLicense?.name);
  }
  assert.match(documentation, /Four official-source runs are committed/i);
  assert.match(documentation, /content\/snapshots\/catalog\.json/);
});
