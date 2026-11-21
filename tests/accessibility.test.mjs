import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import axe from "axe-core";
import { JSDOM } from "jsdom";

import { startBuiltWorker } from "../scripts/built-worker.mjs";

const harness = await startBuiltWorker();
test.after(() => harness.close());

async function render(path) {
  const response = await harness.fetch(`http://localhost${path}`, { headers: { accept: "text/html" } });
  assert.equal(response.status, 200, path);
  return response.text();
}

const caseCatalog = JSON.parse(
  await readFile(new URL("../content/cases/catalog.json", import.meta.url), "utf8"),
);
const routes = [
  "/",
  "/workbench",
  "/worldgraph",
  "/cases",
  ...caseCatalog.cases.map((item) => `/cases/${item.slug}`),
  "/benchmark",
  "/data",
  "/methodology",
  "/docs",
];

test("server-rendered routes have no detectable accessibility violations", async () => {
  for (const path of routes) {
    const dom = new JSDOM(await render(path), {
      pretendToBeVisual: true,
      runScripts: "outside-only",
      url: `http://localhost${path}`,
    });
    dom.window.eval(axe.source);
    const result = await dom.window.axe.run(dom.window.document, {
      resultTypes: ["violations"],
      rules: {
        "color-contrast": { enabled: false },
        "link-in-text-block": { enabled: false },
      },
    });
    assert.equal(
      JSON.stringify(
        result.violations.map((item) => ({
          id: item.id,
          impact: item.impact,
          nodes: item.nodes.map((node) => node.target),
        })),
      ),
      "[]",
      path,
    );
    dom.window.close();
  }
});

test("CSS preserves visible focus and reduced-motion behavior", async () => {
  const css = await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  );
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /outline:\s*3px solid var\(--sky\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /scroll-behavior:\s*auto\s*!important/);
});
