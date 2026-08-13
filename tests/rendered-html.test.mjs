import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

let workerPromise;

async function worker() {
  if (!workerPromise) {
    const workerUrl = new URL("../dist/server/index.js", import.meta.url);
    workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
    workerPromise = import(workerUrl.href).then((module) => module.default);
  }
  return workerPromise;
}

async function render(path = "/") {
  const activeWorker = await worker();
  return activeWorker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

const routes = [
  ["/", "Trace how disruption becomes systemic risk"],
  ["/workbench", "Change an assumption"],
  ["/worldgraph", "Every edge answers"],
  ["/cases", "Twelve complete pipelines"],
  ["/cases/suez-route-restress", "Suez route closure re-stress"],
  ["/benchmark", "tomorrow never leaks into yesterday"],
  ["/data", "Data access is a contract"],
  ["/methodology", "The model may be wrong"],
  ["/docs", "Rebuild the result"],
];

test("server-renders every public product route with truthful status", async () => {
  for (const [path, expected] of routes) {
    const response = await render(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i, path);
    const html = await response.text();
    assert.match(html, new RegExp(expected, "i"), path);
    assert.match(html, /<header\b/i, path);
    assert.match(html, /<main\b/i, path);
    assert.match(html, /<footer\b/i, path);
    assert.equal((html.match(/<h1\b/gi) ?? []).length, 1, `${path} h1 count`);
    assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i, path);
    assert.doesNotMatch(html, /historically scored; not a causal/i, path);
  }
});

test("home and benchmark report the current zero-history boundary", async () => {
  const [home, benchmark] = await Promise.all([
    render("/").then((response) => response.text()),
    render("/benchmark").then((response) => response.text()),
  ]);
  assert.match(home, /Historically scored<\/dt><dd>0<\/dd>/i);
  assert.match(home, /zero launch cases claim empirical scoring/i);
  assert.match(benchmark, /empirical validation not yet established/i);
  assert.match(benchmark, /External validations<\/span><strong>0<\/strong>/i);
});

test("case downloads point to twelve present archives", async () => {
  const catalog = JSON.parse(
    await readFile(new URL("../public/riskpacks/catalog.json", import.meta.url), "utf8"),
  );
  assert.equal(catalog.archives.length, 12);
  for (const archive of catalog.archives) {
    await access(new URL(`../public/riskpacks/${archive.file}`, import.meta.url));
    const html = await render(`/cases/${archive.slug}`).then((response) => response.text());
    assert.match(html, new RegExp(`/riskpacks/${archive.file.replace(".", "\\.")}`));
  }
});

test("every HTML response carries the release security headers", async () => {
  const response = await render("/");
  assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(response.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
  assert.equal(response.headers.get("strict-transport-security"), "max-age=63072000; includeSubDomains");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.has("x-powered-by"), false);
});

test("unknown pages fail closed with a branded 404", async () => {
  for (const path of ["/does-not-exist", "/cases/does-not-exist"]) {
    const response = await render(path);
    assert.equal(response.status, 404, path);
    const html = await response.text();
    assert.match(html, /This path is outside the graph/i, path);
    assert.match(html, /Return home/i, path);
    assert.doesNotMatch(html, /stack|node_modules|internal server error/i, path);
  }
});
