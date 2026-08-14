import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const acceptedRoot = resolve(root, "content/validation/accepted");
const ledgerPath = resolve(root, "content/validation/evidence-ledger.json");
const categories = [
  "historical_replay",
  "external_review",
  "structured_user_study",
  "organizational_adoption",
  "real_world_impact",
] as const;
type Category = (typeof categories)[number];

interface AcceptedRecord {
  schemaVersion: string;
  id: string;
  category: Category;
  status: string;
  reviewedAt: string;
  publicUri: string;
  artifactPath: string;
  artifactSha256: string;
  claimBoundary: string;
  [key: string]: unknown;
}

interface EvidenceLedger {
  schemaVersion: string;
  updatedAt: string;
  evidenceBoundary: string;
  counts: Record<Category, number>;
  readinessArtifacts: Array<{
    id: string;
    category: Category;
    status: "protocol_ready_not_evidence";
    path: string;
    sha256: string;
  }>;
}

function fail(message: string): never {
  throw new Error(`Evidence validation failed: ${message}`);
}

function repositoryPath(path: string): string {
  if (!/^[A-Za-z0-9._/-]+$/.test(path) || path.split("/").includes("..")) {
    fail(`unsafe repository path ${path}`);
  }
  const target = resolve(root, path);
  const offset = relative(root, target);
  if (isAbsolute(offset) || offset === ".." || offset.startsWith(`..${sep}`)) {
    fail(`path escapes repository: ${path}`);
  }
  return target;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function array(value: unknown, minimum = 1): value is unknown[] {
  return Array.isArray(value) && value.length >= minimum;
}

async function digest(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function validateCommon(record: AcceptedRecord, file: string): void {
  if (record.schemaVersion !== "cascadelens-accepted-evidence/1.0") fail(`${file}: schemaVersion`);
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(record.id)) fail(`${file}: id`);
  if (!categories.includes(record.category)) fail(`${file}: category`);
  if (record.status !== "accepted_public_evidence") fail(`${file}: status`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(record.reviewedAt)) fail(`${file}: reviewedAt`);
  if (!/^https:\/\//.test(record.publicUri)) fail(`${file}: publicUri must be HTTPS`);
  if (!/^[a-f0-9]{64}$/.test(record.artifactSha256)) fail(`${file}: artifactSha256`);
  if (!nonEmpty(record.claimBoundary)) fail(`${file}: claimBoundary`);
}

function validateCategory(record: AcceptedRecord, file: string): void {
  if (record.category === "historical_replay") {
    if (!nonEmpty(record.caseId)) fail(`${file}: caseId`);
    if (!/^[a-f0-9]{40}$/.test(String(record.protocolCommit))) fail(`${file}: protocolCommit`);
    if (!nonEmpty(record.decisionCutoff) || !nonEmpty(record.outcomeAvailableAt)) fail(`${file}: cutoff times`);
    if (record.benchmarkStatus !== "historically_scored") fail(`${file}: benchmarkStatus`);
    if (!Number.isInteger(record.sampleSize) || Number(record.sampleSize) < 2) fail(`${file}: sampleSize`);
    if (!Array.isArray(record.leakageIssues) || record.leakageIssues.length !== 0) fail(`${file}: leakageIssues`);
    if (!record.metrics || typeof record.metrics !== "object") fail(`${file}: metrics`);
  } else if (record.category === "external_review") {
    for (const field of ["reviewerIdentity", "expertise", "conflictStatement", "scope", "method", "findings"] as const) {
      if (!nonEmpty(record[field])) fail(`${file}: ${field}`);
    }
    if (!/^[a-f0-9]{40}$/.test(String(record.reviewedCommit))) fail(`${file}: reviewedCommit`);
  } else if (record.category === "structured_user_study") {
    if (!Number.isInteger(record.participantCount) || Number(record.participantCount) < 1) fail(`${file}: participantCount`);
    for (const field of ["participantCriteria", "consentProcedure", "resultsSummary"] as const) {
      if (!nonEmpty(record[field])) fail(`${file}: ${field}`);
    }
    if (!array(record.tasks) || record.failuresIncluded !== true) fail(`${file}: tasks or failuresIncluded`);
  } else if (record.category === "organizational_adoption") {
    for (const field of ["organization", "taskScope", "startedAt", "usageEvidence"] as const) {
      if (!nonEmpty(record[field])) fail(`${file}: ${field}`);
    }
    if (record.permissionToPublish !== true) fail(`${file}: permissionToPublish`);
  } else {
    for (const field of ["organization", "counterfactualMethod", "baseline", "measuredOutcome", "limitations"] as const) {
      if (!nonEmpty(record[field])) fail(`${file}: ${field}`);
    }
    if (record.permissionToPublish !== true) fail(`${file}: permissionToPublish`);
  }
}

const ledger = JSON.parse(await readFile(ledgerPath, "utf8")) as EvidenceLedger;
if (ledger.schemaVersion !== "cascadelens-evidence-ledger/1.0") fail("ledger schemaVersion");
if (!/^\d{4}-\d{2}-\d{2}$/.test(ledger.updatedAt)) fail("ledger updatedAt");
if (!/templates?.*do not|does not.*count/i.test(ledger.evidenceBoundary)) fail("ledger evidence boundary");

const derived = Object.fromEntries(categories.map((category) => [category, 0])) as Record<Category, number>;
const ids = new Set<string>();
for (const name of (await readdir(acceptedRoot)).filter((item) => item.endsWith(".json")).sort()) {
  const path = resolve(acceptedRoot, name);
  const record = JSON.parse(await readFile(path, "utf8")) as AcceptedRecord;
  validateCommon(record, name);
  validateCategory(record, name);
  if (ids.has(record.id)) fail(`${name}: duplicate id ${record.id}`);
  ids.add(record.id);
  const reportPath = repositoryPath(record.artifactPath);
  if (await digest(reportPath) !== record.artifactSha256) fail(`${name}: artifact hash mismatch`);
  derived[record.category] += 1;
}

for (const category of categories) {
  if (!Number.isInteger(ledger.counts[category]) || ledger.counts[category] < 0) fail(`ledger count ${category}`);
  if (ledger.counts[category] !== derived[category]) fail(`ledger count ${category} does not match accepted records`);
}

const readinessIds = new Set<string>();
for (const artifact of ledger.readinessArtifacts) {
  if (readinessIds.has(artifact.id)) fail(`duplicate readiness id ${artifact.id}`);
  readinessIds.add(artifact.id);
  if (!categories.includes(artifact.category)) fail(`${artifact.id}: category`);
  if (artifact.status !== "protocol_ready_not_evidence") fail(`${artifact.id}: status`);
  if (!/^[a-f0-9]{64}$/.test(artifact.sha256)) fail(`${artifact.id}: sha256`);
  if (await digest(repositoryPath(artifact.path)) !== artifact.sha256) fail(`${artifact.id}: hash mismatch`);
}

process.stdout.write(
  `Validated evidence ledger: ${categories.map((category) => `${category}=${derived[category]}`).join(", ")}; ${ledger.readinessArtifacts.length} non-counting protocols ready.\n`,
);

