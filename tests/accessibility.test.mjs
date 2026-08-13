import assert from "node:assert/strict";
import test from "node:test";
import axe from "axe-core";
import { JSDOM } from "jsdom";

let workerPromise;
async function render(path) {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("a11y", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  const worker = await workerPromise;
  const response = await worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.equal(response.status, 200, path);
  return response.text();
}

const routes = [
  "/",
  "/workbench",
  "/worldgraph",
  "/cases",
  "/cases/suez-route-restress",
  "/benchmark",
  "/data",
  "/methodology",
  "/docs",
];

test("server-rendered routes have no detectable serious accessibility violations", async () => {
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
    const serious = result.violations.filter((item) =>
      item.impact === "critical" || item.impact === "serious",
    );
    assert.equal(
      JSON.stringify(
        serious.map((item) => ({
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
