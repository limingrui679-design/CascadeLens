import { access, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  sha256Text,
  stableStringify,
  validateScenario,
  validateScenarioAgainstSnapshot,
  verifyRiskPack,
  verifySnapshot,
  type AssumptionRegister,
  type BenchmarkResult,
  type GraphSnapshot,
  type ShockScenario,
} from "../packages/core/src/index";
import { connectorCatalog } from "../packages/connectors/src/index";
import { referenceCaseSpecs } from "../packages/cases/src/index";
import { readRiskPackDirectory } from "../packages/cli/src/io";

const root = resolve(new URL("..", import.meta.url).pathname);
const required = [
  "README.md",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CITATION.cff",
  "docs/PRODUCT_REQUIREMENTS.md",
  "docs/ACCEPTANCE_MATRIX.md",
  "docs/ARCHITECTURE.md",
  "docs/connectors/DATA_CATALOG.md",
  "docs/connectors/CONNECTOR_CONTRACT.md",
  "scripts/sites-vite-plugin.ts",
  "vite.config.ts",
  "schemas/shockscript-0.1.0.schema.json",
  "schemas/worldgraph-0.1.0.schema.json",
  "schemas/riskpack-manifest-0.1.0.schema.json",
  "schemas/assumption-register-1.0.0.schema.json",
  "schemas/model-card-1.0.0.schema.json",
  "schemas/riskpack-limitations-1.0.0.schema.json",
  "content/catalog/connectors.json",
  "content/cases/catalog.json",
  "content/cases/README.md",
  "content/snapshots/catalog.json",
  "content/snapshots/README.md",
];

function fail(message: string): never {
  throw new Error(`Content validation failed: ${message}`);
}

async function json<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(root, path), "utf8")) as T;
}

for (const path of required) await access(join(root, path));

const generatedConnectors = await json<{
  schemaVersion: string;
  generatedFrom: string;
  connectors: unknown[];
}>("content/catalog/connectors.json");
if (
  generatedConnectors.schemaVersion !== "0.1.0" ||
  generatedConnectors.generatedFrom !== "packages/connectors/src/catalog.ts" ||
  stableStringify(generatedConnectors.connectors) !== stableStringify(connectorCatalog)
) {
  fail("generated connector catalog is stale; run npm run generate:catalog");
}
if (connectorCatalog.length !== 10 || new Set(connectorCatalog.map((item) => item.id)).size !== 10) {
  fail("connector catalog must contain exactly ten unique core connectors");
}

const publicSnapshots = await json<{
  schemaVersion: string;
  snapshotCount: number;
  factCount: number;
  dependencyEdgeCount: number;
  evidenceBoundary: string;
  snapshots: Array<{ connectorId: string; slug: string }>;
}>("content/snapshots/catalog.json");
if (
  publicSnapshots.schemaVersion !== "cascadelens-public-snapshots/1.0" ||
  publicSnapshots.snapshotCount !== 3 ||
  publicSnapshots.snapshots.length !== 3 ||
  publicSnapshots.factCount !== 3_802 ||
  publicSnapshots.dependencyEdgeCount !== 0 ||
  !/not historical outcomes/i.test(publicSnapshots.evidenceBoundary)
) {
  fail("public snapshot catalog must preserve its exact count and evidence boundary");
}
if (new Set(publicSnapshots.snapshots.map((item) => item.slug)).size !== 3) {
  fail("public snapshot slugs must be unique");
}
for (const record of publicSnapshots.snapshots) {
  const descriptor = connectorCatalog.find((item) => item.id === record.connectorId);
  if (!descriptor || !descriptor.rawRedistributable || !descriptor.redistributionLicense) {
    fail(`${record.slug} must map to a redistributable, licensed connector descriptor`);
  }
}

const catalog = await json<{
  status: string;
  caseCount: number;
  historicallyScoredCaseCount: number;
  cases: Array<{ slug: string; scoringStatus: string; snapshotDigest: string }>;
}>("content/cases/catalog.json");
if (catalog.status !== "reference_cases_not_empirical_validation") {
  fail("case catalog must preserve the non-empirical validation boundary");
}
if (catalog.caseCount !== 12 || catalog.cases.length !== 12 || referenceCaseSpecs.length !== 12) {
  fail("case library must contain exactly twelve reference cases");
}
if (catalog.historicallyScoredCaseCount !== 0) {
  fail("launch cases cannot claim historical scoring without separated outcomes");
}
const expectedSlugs = referenceCaseSpecs.map((item) => item.slug).sort();
const catalogSlugs = catalog.cases.map((item) => item.slug).sort();
if (stableStringify(expectedSlugs) !== stableStringify(catalogSlugs)) {
  fail("case catalog slugs do not match the source specifications");
}

for (const record of catalog.cases) {
  const caseRoot = `content/cases/${record.slug}`;
  const [scenario, snapshot, assumptions, benchmark, report, assumptionsText] = await Promise.all([
    json<ShockScenario>(`${caseRoot}/scenario.json`),
    json<GraphSnapshot>(`${caseRoot}/graph/snapshot.json`),
    json<AssumptionRegister>(`${caseRoot}/assumptions.json`),
    json<BenchmarkResult>(`${caseRoot}/results/benchmark.json`),
    json<{ verified: boolean; riskPackVerificationIssues: string[] }>(`${caseRoot}/build-report.json`),
    readFile(join(root, caseRoot, "assumptions.json"), "utf8"),
  ]);
  if (scenario.scenarioId !== record.slug || assumptions.scenarioId !== record.slug) {
    fail(`${record.slug} has mismatched scenario identifiers`);
  }
  if (validateScenario(scenario).some((issue) => issue.severity === "error")) {
    fail(`${record.slug} has an invalid ShockScript`);
  }
  if ((await verifySnapshot(snapshot)).some((issue) => issue.severity === "error")) {
    fail(`${record.slug} has an invalid or tampered graph snapshot`);
  }
  if (validateScenarioAgainstSnapshot(scenario, snapshot).some((issue) => issue.severity === "error")) {
    fail(`${record.slug} fails the scenario-to-snapshot contract`);
  }
  if (snapshot.contentDigest !== record.snapshotDigest) {
    fail(`${record.slug} catalog snapshot digest is stale`);
  }
  if (benchmark.status !== "scenario_only" || record.scoringStatus !== "scenario_only") {
    fail(`${record.slug} overstates its benchmark status`);
  }
  if (benchmark.sampleSize !== 0) fail(`${record.slug} unexpectedly contains outcome observations`);
  if (!report.verified || report.riskPackVerificationIssues.length !== 0) {
    fail(`${record.slug} build report is not verified`);
  }
  if (
    snapshot.nodes.some((item) => item.evidence.grade !== "MODEL_INFERRED") ||
    snapshot.edges.some((item) => item.evidence.grade !== "MODEL_INFERRED")
  ) {
    fail(`${record.slug} promotes an assumed topology to observed evidence`);
  }
  const assumptionSource = snapshot.sources.find((source) => source.id.endsWith(":assumptions"));
  const contextSource = snapshot.sources.find((source) => source.id.endsWith(":context"));
  if (
    !assumptionSource ||
    assumptionSource.artifactKind !== "normalized_snapshot" ||
    assumptionSource.sha256 !== (await sha256Text(assumptionsText))
  ) {
    fail(`${record.slug} assumption source digest or artifact kind is invalid`);
  }
  if (!contextSource || contextSource.artifactKind !== "citation_record" || contextSource.role !== "context") {
    fail(`${record.slug} context page is not isolated as a citation-only record`);
  }
  const pack = await readRiskPackDirectory(join(root, caseRoot, "riskpack"));
  const packIssues = await verifyRiskPack(pack);
  if (packIssues.length > 0) fail(`${record.slug} RiskPack: ${packIssues.join(", ")}`);
  if (/\/(?:Users|home)\//.test(pack.files["REBUILD.txt"])) {
    fail(`${record.slug} RiskPack leaks an absolute local path`);
  }
}

const publicRoots = ["app", "content", "docs", "packages", "schemas", "scripts"];
const prohibited = new RegExp(
  [
    `personal${" statement"}`,
    `graduate${" application"}`,
    `admissions${" essay"}`,
    `${"申请"}文书`,
    `${"素材"}收集表`,
  ].join("|"),
  "i",
);
async function scan(directory: string): Promise<void> {
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const relativePath = join(directory, entry.name);
    if (entry.isDirectory()) await scan(relativePath);
    else if (/\.(?:ts|tsx|json|md|txt|yaml|yml)$/i.test(entry.name)) {
      if (prohibited.test(await readFile(join(root, relativePath), "utf8"))) {
        fail(`application-specific language found in public artifact ${relativePath}`);
      }
    }
  }
}
for (const directory of publicRoots) await scan(directory);

process.stdout.write(
  `Validated ${required.length} required artifacts, 10 connectors, 3 frozen public snapshots, and 12 verified scenario-only reference cases.\n`,
);
