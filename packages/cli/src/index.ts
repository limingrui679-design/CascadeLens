#!/usr/bin/env node
import { resolve } from "node:path";
import {
  ENGINE_VERSION,
  CascadeLensValidationError,
  compareCanonicalStrings,
  analyzeInterventions,
  createRiskPack,
  parseShockScript,
  runCascadeBounds,
  scoreReplay,
  stableStringify,
  valueObservations,
  validateScenario,
  validateScenarioAgainstSnapshot,
  verifyRiskPack,
  verifyRiskPackDetailed,
  verifySnapshot,
  type AssumptionRegister,
  type CandidateObservation,
  type GraphSnapshot,
  type ModelCard,
} from "../../core/src/index";
import {
  adapters,
  connectorById,
  connectorCatalog,
  runConnectorPlan,
  type ConnectorAdapter,
} from "../../connectors/src/index";
import { referenceCaseSpecs } from "../../cases/src/index";
import { buildCases } from "../../../scripts/build-cases";
import {
  readBoundedText,
  readJson,
  readRiskPackDirectory,
  writeJsonAtomic,
  writeRiskPackDirectory,
} from "./io";

const VERSION = "0.3.0";
const HELP = `CascadeLens ${VERSION}

Usage:
  cascadelens validate <scenario> [--graph <snapshot>]
  cascadelens run <scenario> --graph <snapshot> --out <results.json>
  cascadelens pack <scenario> --graph <snapshot> --assumptions <file> --model-card <file> --observation-candidates <file> --out <directory>
  cascadelens verify <riskpack-directory> [--expected-digest <sha256>]
  cascadelens cases list
  cascadelens cases build [slug|all]
  cascadelens cases verify [slug|all]
  cascadelens connectors list
  cascadelens connectors show <id>
  cascadelens connectors acquire <id> --query <query.json> --out <directory> --user-agent <identifying-agent>

All generated impacts are scenarios. Recomputed RiskPack verification is derivation
evidence, not empirical accuracy, publisher identity, adoption, or realized impact.
`;

interface ParsedArguments {
  positional: string[];
  options: Map<string, string>;
}

function parseArguments(values: string[], allowed: string[]): ParsedArguments {
  const positional: string[] = [];
  const options = new Map<string, string>();
  const allowedSet = new Set(allowed);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      positional.push(value);
      continue;
    }
    if (!allowedSet.has(value)) throw new TypeError(`Unknown option ${value}.`);
    if (options.has(value)) throw new TypeError(`Duplicate option ${value}.`);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) throw new TypeError(`${value} requires a value.`);
    options.set(value, next);
    index += 1;
  }
  return { positional, options };
}

function requiredOption(parsed: ParsedArguments, name: string): string {
  const value = parsed.options.get(name);
  if (!value) throw new TypeError(`Missing required option ${name}.`);
  return value;
}

function assertPositional(parsed: ParsedArguments, count: number, usage: string): void {
  if (parsed.positional.length !== count) throw new TypeError(`Usage: ${usage}`);
}

async function loadScenario(path: string) {
  return parseShockScript(await readBoundedText(path, 1_000_000));
}

async function loadSnapshot(path: string): Promise<GraphSnapshot> {
  const snapshot = await readJson<GraphSnapshot>(path, 100_000_000, "WorldGraph snapshot");
  const issues = await verifySnapshot(snapshot);
  if (issues.some((issue) => issue.severity === "error")) {
    throw new TypeError(`Invalid WorldGraph:\n${issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")}`);
  }
  return snapshot;
}

async function validateCommand(args: string[]): Promise<void> {
  const parsed = parseArguments(args, ["--graph"]);
  assertPositional(parsed, 1, "cascadelens validate <scenario> [--graph <snapshot>]");
  const scenario = await loadScenario(parsed.positional[0]);
  const issues = [...validateScenario(scenario)];
  const graphPath = parsed.options.get("--graph");
  if (graphPath) {
    const snapshot = await loadSnapshot(graphPath);
    issues.push(...validateScenarioAgainstSnapshot(scenario, snapshot));
  }
  if (issues.some((issue) => issue.severity === "error")) {
    throw new TypeError(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
  }
  process.stdout.write(`VALID ${scenario.scenarioId}${graphPath ? " + snapshot contract" : ""}\n`);
}

async function analyses(scenarioPath: string, graphPath: string) {
  const [scenario, snapshot] = await Promise.all([
    loadScenario(scenarioPath),
    loadSnapshot(graphPath),
  ]);
  const bounds = await runCascadeBounds(snapshot, scenario);
  const interventions = await analyzeInterventions(snapshot, scenario);
  const benchmark = scoreReplay(snapshot, scenario, bounds, []);
  return { scenario, snapshot, bounds, interventions, benchmark };
}

async function runCommand(args: string[]): Promise<void> {
  const parsed = parseArguments(args, ["--graph", "--out"]);
  assertPositional(parsed, 1, "cascadelens run <scenario> --graph <snapshot> --out <results.json>");
  const graph = requiredOption(parsed, "--graph");
  const out = requiredOption(parsed, "--out");
  const result = await analyses(parsed.positional[0], graph);
  await writeJsonAtomic(out, {
    status: "scenario_output_not_empirical_validation",
    scenarioId: result.scenario.scenarioId,
    snapshotDigest: result.snapshot.contentDigest,
    bounds: result.bounds,
    interventions: result.interventions,
    benchmark: result.benchmark,
  });
  process.stdout.write(`WROTE ${resolve(out)}\n`);
}

function validateAssumptions(
  value: AssumptionRegister,
  scenarioId: string,
): void {
  if (
    !value ||
    value.scenarioId !== scenarioId ||
    value.status !== "scenario_parameters_not_observations" ||
    !Array.isArray(value.assumptions) ||
    typeof value.disclaimer !== "string" ||
    value.disclaimer.trim() === ""
  ) {
    throw new TypeError("Assumption register is incomplete or references another scenario.");
  }
}

function validateModelCard(value: ModelCard): void {
  if (
    !value ||
    typeof value.modelId !== "string" ||
    value.version !== ENGINE_VERSION ||
    !Array.isArray(value.intendedUse) ||
    !Array.isArray(value.outOfScope) ||
    !Array.isArray(value.limitations)
  ) {
    throw new TypeError("Model card is incomplete or incompatible with this engine version.");
  }
}

async function packCommand(args: string[]): Promise<void> {
  const parsed = parseArguments(args, [
    "--graph",
    "--assumptions",
    "--model-card",
    "--observation-candidates",
    "--out",
  ]);
  assertPositional(
    parsed,
    1,
    "cascadelens pack <scenario> --graph <snapshot> --assumptions <file> --model-card <file> --observation-candidates <file> --out <directory>",
  );
  const result = await analyses(parsed.positional[0], requiredOption(parsed, "--graph"));
  const [assumptions, modelCard, observationCandidates] = await Promise.all([
    readJson<AssumptionRegister>(requiredOption(parsed, "--assumptions"), 5_000_000),
    readJson<ModelCard>(requiredOption(parsed, "--model-card"), 1_000_000),
    readJson<CandidateObservation[]>(
      requiredOption(parsed, "--observation-candidates"),
      5_000_000,
      "observation candidates",
    ),
  ]);
  validateAssumptions(assumptions, result.scenario.scenarioId);
  validateModelCard(modelCard);
  const riskValuePerUnit = 100;
  const observationValues = await valueObservations(
    result.snapshot,
    result.scenario,
    observationCandidates,
    riskValuePerUnit,
  );
  const pack = await createRiskPack({
    packId: `riskpack:${result.scenario.scenarioId}:cli`,
    generatedAt: new Date().toISOString(),
    snapshot: result.snapshot,
    scenario: result.scenario,
    bounds: result.bounds,
    interventionAnalysis: result.interventions,
    benchmark: result.benchmark,
    assumptions,
    modelCard,
    observationValues,
    observationCandidates,
    riskValuePerUnit,
    rebuildCommand:
      "cascadelens pack <scenario.json> --graph <snapshot.json> --assumptions <assumptions.json> --model-card <model-card.json> --observation-candidates <candidates.json> --out <directory>",
  });
  const issues = await verifyRiskPack(pack);
  if (issues.length > 0) throw new Error(`Generated RiskPack failed verification: ${issues.join(", ")}`);
  const out = requiredOption(parsed, "--out");
  await writeRiskPackDirectory(out, pack);
  process.stdout.write(`WROTE RECOMPUTED RISKPACK ${resolve(out)}\n`);
}

async function verifyDirectory(path: string, expectedDigest?: string): Promise<void> {
  const report = await verifyRiskPackDetailed(
    await readRiskPackDirectory(path),
    expectedDigest,
  );
  if (report.issues.length > 0) {
    throw new Error(
      `INVALID ${path}\n${report.issues.map((issue) => `- ${issue}`).join("\n")}`,
    );
  }
  process.stdout.write(
    `VERIFIED RECOMPUTED ${resolve(path)} pack-digest=${report.packDigest}${
      expectedDigest ? " external-digest=matched" : " external-digest=not-supplied"
    }\n`,
  );
}

async function verifyCommand(args: string[]): Promise<void> {
  const parsed = parseArguments(args, ["--expected-digest"]);
  assertPositional(
    parsed,
    1,
    "cascadelens verify <riskpack-directory> [--expected-digest <sha256>]",
  );
  await verifyDirectory(
    parsed.positional[0],
    parsed.options.get("--expected-digest"),
  );
}

async function casesCommand(args: string[]): Promise<void> {
  const parsed = parseArguments(args, []);
  if (parsed.positional[0] === "list" && parsed.positional.length === 1) {
    process.stdout.write(
      `${stableStringify({ status: "reference_cases_not_empirical_validation", cases: referenceCaseSpecs.map(({ slug, title, domain, classification }) => ({ slug, title, domain, classification })) }, 2)}\n`,
    );
    return;
  }
  if (parsed.positional[0] === "build" && parsed.positional.length <= 2) {
    const selected = parsed.positional[1];
    await buildCases(selected === "all" ? undefined : selected);
    return;
  }
  if (parsed.positional[0] === "verify" && parsed.positional.length <= 2) {
    const selected = parsed.positional[1];
    const specs = !selected || selected === "all"
      ? referenceCaseSpecs
      : referenceCaseSpecs.filter((spec) => spec.slug === selected);
    if (specs.length === 0) throw new RangeError(`Unknown reference case ${selected}.`);
    for (const spec of specs) {
      await verifyDirectory(resolve("content", "cases", spec.slug, "riskpack"));
    }
    return;
  }
  throw new TypeError("Usage: cascadelens cases <list|build|verify> [slug|all]");
}

async function connectorsCommand(args: string[]): Promise<void> {
  const parsed = parseArguments(args, ["--query", "--out", "--user-agent"]);
  if (parsed.positional[0] === "list" && parsed.positional.length === 1) {
    process.stdout.write(`${stableStringify(connectorCatalog, 2)}\n`);
    return;
  }
  if (parsed.positional[0] === "show" && parsed.positional.length === 2) {
    process.stdout.write(`${stableStringify(connectorById(parsed.positional[1]), 2)}\n`);
    return;
  }
  if (parsed.positional[0] === "acquire" && parsed.positional.length === 2) {
    const id = parsed.positional[1] as keyof typeof adapters;
    const adapter = adapters[id] as ConnectorAdapter<Record<string, unknown>> | undefined;
    if (!adapter) throw new RangeError(`Unknown connector ${id}.`);
    if (adapter.descriptor.runtime !== "remote") {
      throw new TypeError(
        `${id} is import-only; use its adapter through the SDK with a lawfully obtained local export.`,
      );
    }
    const query = await readJson<Record<string, unknown>>(
      requiredOption(parsed, "--query"),
      1_000_000,
      "connector query",
    );
    const result = await runConnectorPlan(
      adapter,
      [{ id: "partition-000001", query }],
      requiredOption(parsed, "--out"),
      { userAgent: requiredOption(parsed, "--user-agent") },
    );
    process.stdout.write(
      `${stableStringify({
        status: "acquired_normalized_and_mapped",
        evidenceBoundary:
          "The generic WorldGraph mapping creates metric nodes only and does not infer dependency edges.",
        ...result,
      }, 2)}\n`,
    );
    return;
  }
  throw new TypeError("Usage: cascadelens connectors <list|show|acquire> [id]");
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const command = args[0];
  if (!command || command === "help" || command === "--help" || command === "-h") {
    process.stdout.write(HELP);
    return;
  }
  if (command === "--version" || command === "version") {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (command === "validate") return validateCommand(args.slice(1));
  if (command === "run") return runCommand(args.slice(1));
  if (command === "pack") return packCommand(args.slice(1));
  if (command === "verify") return verifyCommand(args.slice(1));
  if (command === "cases") return casesCommand(args.slice(1));
  if (command === "connectors") return connectorsCommand(args.slice(1));
  throw new TypeError(`Unknown command ${command}. Run cascadelens --help.`);
}

main().catch((error: unknown) => {
  const message = error instanceof CascadeLensValidationError
    ? `${error.message}\n${[...error.issues]
        .sort(
          (left, right) =>
            compareCanonicalStrings(left.path, right.path) ||
            compareCanonicalStrings(left.code, right.code),
        )
        .map((issue) => `- ${issue.path} [${issue.code}]: ${issue.message}`)
        .join("\n")}`
    : error instanceof Error
      ? error.message
      : String(error);
  process.stderr.write(`ERROR ${message}\n`);
  process.exitCode = 1;
});
