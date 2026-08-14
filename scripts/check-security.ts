import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const excludedDirectories = new Set([
  ".git",
  ".next",
  ".pytest_cache",
  ".ruff_cache",
  ".vinext",
  ".wrangler",
  "dist",
  "node_modules",
  "outputs",
  "__pycache__",
  "work",
]);
const binaryExtensions = new Set([
  ".gif", ".ico", ".jpg", ".jpeg", ".pdf", ".png", ".woff", ".woff2", ".zip",
]);
const maximumScannedFileBytes = 20 * 1024 * 1024;

async function listFiles(directory: string): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      output.push(path);
    } else if (entry.isDirectory()) {
      output.push(...(await listFiles(path)));
    } else if (entry.isFile()) {
      output.push(path);
    }
  }
  return output;
}

interface Rule {
  id: string;
  pattern: RegExp;
  allowed?: (path: string, line: string) => boolean;
}

const rules: Rule[] = [
  { id: "private_key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { id: "github_token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,255}\b/ },
  { id: "aws_access_key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { id: "slack_token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  {
    id: "assigned_secret",
    pattern: /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*["'][^"'\s]{12,}["']/i,
    allowed: (path, line) =>
      path === "packages/connectors/src/network.ts" && line.includes('"access_token"'),
  },
  {
    id: "absolute_user_path",
    pattern: /\/(?:Users|home)\/[A-Za-z0-9._-]+\//,
    allowed: (path) =>
      path === "packages/core/src/riskpack.ts" || path === "tests/cli/cli.test.ts",
  },
  {
    id: "private_application_language",
    pattern: new RegExp(
      [
        `graduate${" application"}`,
        `admissions${" essay"}`,
        `personal${" statement"}`,
        `${"申请"}${"项目"}`,
        `${"申请"}${"文书"}`,
        `15\\s*个?${"项目"}`,
      ].join("|"),
      "i",
    ),
    allowed: (path) =>
      path === "scripts/validate-content.ts" || path === "scripts/check-security.ts",
  },
];

const findings: string[] = [];
for (const path of await listFiles(root)) {
  const relativePath = relative(root, path);
  const info = await stat(path);
  if (!info.isFile()) {
    findings.push(`symbolic_or_non_regular_file:${relativePath}`);
    continue;
  }
  if (binaryExtensions.has(extname(path).toLowerCase())) continue;
  if (info.size > maximumScannedFileBytes) {
    findings.push(`oversized_unscanned_text:${relativePath}:${info.size}`);
    continue;
  }
  const text = await readFile(path, "utf8");
  for (const [index, line] of text.split("\n").entries()) {
    for (const rule of rules) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line) && !rule.allowed?.(relativePath, line)) {
        findings.push(`${rule.id}:${relativePath}:${index + 1}`);
      }
    }
  }
}

const expectedHeaders = new Map([
  ["content-security-policy", /default-src 'self'.*frame-ancestors 'none'.*script-src 'self' 'nonce-[A-Za-z0-9+/=]+'.*style-src 'self' 'nonce-[A-Za-z0-9+/=]+'.*style-src-attr 'none'/],
  ["cross-origin-opener-policy", /^same-origin$/],
  ["cross-origin-resource-policy", /^same-origin$/],
  ["permissions-policy", /camera=\(\).*microphone=\(\)/],
  ["referrer-policy", /^no-referrer$/],
  ["strict-transport-security", /^max-age=63072000; includeSubDomains$/],
  ["x-content-type-options", /^nosniff$/],
  ["x-frame-options", /^DENY$/],
]);
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("security", `${process.pid}-${Date.now()}`);
const worker = await import(workerUrl.href).then((module) => module.default);
const response = await worker.fetch(
  new Request("http://localhost/", { headers: { accept: "text/html" } }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);
if (response.status !== 200) findings.push(`security_header_render_status:${response.status}`);
for (const [name, pattern] of expectedHeaders) {
  const value = response.headers.get(name) ?? "";
  if (!pattern.test(value)) findings.push(`missing_or_invalid_header:${name}`);
}
const csp = response.headers.get("content-security-policy") ?? "";
if (/script-src[^;]*'unsafe-inline'/.test(csp)) {
  findings.push("unsafe_inline_script_csp");
}
if (/style-src[^;]*'unsafe-inline'/.test(csp)) {
  findings.push("unsafe_inline_style_csp");
}
if (response.headers.has("x-powered-by")) findings.push("framework_disclosure:x-powered-by");
const blockedControlResponse = await worker.fetch(
  new Request("http://localhost/__vinext/prerender/static-params", {
    headers: {
      "x-vinext-prerender-secret": "publicly-derived-build-token",
      cookie: "__prerender_bypass=publicly-derived-build-token",
    },
  }),
  { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
  { waitUntil() {}, passThroughOnException() {} },
);
if (blockedControlResponse.status !== 403) {
  findings.push(`framework_control_request_not_blocked:${blockedControlResponse.status}`);
}

console.log(
  JSON.stringify(
    {
      scannedFiles: (await listFiles(root)).length,
      responseHeaders: Object.fromEntries(
        [...expectedHeaders.keys()].map((name) => [name, response.headers.get(name)]),
      ),
      findings,
    },
    null,
    2,
  ),
);
if (findings.length > 0) process.exitCode = 1;
