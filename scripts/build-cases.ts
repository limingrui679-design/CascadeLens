import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildReferenceCase,
  caseCatalogRecord,
  referenceCaseSpecs,
  type BuiltReferenceCase,
} from "../packages/cases/src/index";
import { stableStringify } from "../packages/core/src/index";

const repositoryRoot = resolve(new URL("..", import.meta.url).pathname);
const contentRoot = join(repositoryRoot, "content");
const finalRoot = join(contentRoot, "cases");

function json(value: unknown): string {
  return stableStringify(value, 2) + "\n";
}

async function write(path: string, content: string): Promise<void> {
  await mkdir(resolve(path, ".."), { recursive: true });
  await writeFile(path, content, { encoding: "utf8", flag: "w" });
}

function readme(built: BuiltReferenceCase): string {
  const { spec, snapshot, benchmark, bounds, interventions } = built;
  return `# ${spec.title}

Status: **${benchmark.status}**  
Classification: **${spec.classification}**  
Decision cutoff: **${snapshot.decisionCutoff}**

${spec.summary}

## Decision question

${spec.decisionQuestion}

## Evidence boundary

The public reference below is scenario context only. It does not supply the graph topology, dependency weights, shock magnitude, intervention effects, or outcome labels. Every numeric parameter is recorded in \`assumptions.json\` as a model assumption. This case has no separated real-world outcome observations and therefore is not historically scored.

- Context: [${spec.context.title}](${spec.context.uri})
- Publisher: ${spec.context.publisher}
- Snapshot digest: \`${snapshot.contentDigest}\`
- Lower / central / upper total impact: ${bounds.lower.totalWeightedImpact.toFixed(6)} / ${bounds.central.totalWeightedImpact.toFixed(6)} / ${bounds.upper.totalWeightedImpact.toFixed(6)}
- Recommendation status: \`${interventions.recommendationStatus}\`

## Rebuild and verify

\`\`\`bash
npm run cascadelens -- cases build ${spec.slug}
npm run cascadelens -- verify content/cases/${spec.slug}/riskpack
\`\`\`

## Limitations

${spec.specificLimitation}

Outputs are stress-scenario calculations, not forecasts, causal estimates, realized losses, operational recommendations, external validation, deployment evidence, or user impact.
`;
}

async function writeBuiltCase(root: string, built: BuiltReferenceCase): Promise<void> {
  const caseRoot = join(root, built.spec.slug);
  await write(join(caseRoot, "README.md"), readme(built));
  await write(join(caseRoot, "case.json"), json(caseCatalogRecord(built)));
  await write(join(caseRoot, "assumptions.json"), built.assumptionsText);
  await write(join(caseRoot, "context-citation.json"), json(built.contextCitation));
  await write(join(caseRoot, "graph", "snapshot.json"), json(built.snapshot));
  await write(join(caseRoot, "scenario.json"), json(built.scenario));
  await write(join(caseRoot, "model-card.json"), json(built.modelCard));
  await write(join(caseRoot, "results", "cascade-bounds.json"), json(built.bounds));
  await write(join(caseRoot, "results", "interventions.json"), json(built.interventions));
  await write(join(caseRoot, "results", "observability.json"), json(built.observability));
  await write(join(caseRoot, "results", "benchmark.json"), json(built.benchmark));
  await write(
    join(caseRoot, "build-report.json"),
    json({
      caseId: built.spec.slug,
      generatedAt: built.snapshot.generatedAt,
      riskPackVerificationIssues: built.verificationIssues,
      verified: built.verificationIssues.length === 0,
    }),
  );
  for (const [relativePath, content] of Object.entries(built.riskPack.files)) {
    await write(join(caseRoot, "riskpack", relativePath), content);
  }
}

export async function buildCases(selectedSlug?: string): Promise<void> {
  const specs = selectedSlug
    ? referenceCaseSpecs.filter((spec) => spec.slug === selectedSlug)
    : referenceCaseSpecs;
  if (specs.length === 0) {
    throw new RangeError(`Unknown reference case: ${selectedSlug}`);
  }

  const temporaryRoot = await mkdtemp(join(contentRoot, ".cases-build-"));
  try {
    const builtCases: BuiltReferenceCase[] = [];
    for (const spec of specs) {
      const built = await buildReferenceCase(spec);
      if (built.verificationIssues.length > 0) {
        throw new Error(
          `${spec.slug} produced an invalid RiskPack: ${built.verificationIssues.join(", ")}`,
        );
      }
      builtCases.push(built);
      await writeBuiltCase(temporaryRoot, built);
    }

    if (selectedSlug) {
      const source = join(temporaryRoot, selectedSlug);
      const destination = join(finalRoot, selectedSlug);
      await mkdir(finalRoot, { recursive: true });
      await rm(destination, { recursive: true, force: true });
      await rename(source, destination);
      process.stdout.write(`Built and verified reference case ${selectedSlug}.\n`);
      return;
    }

    const catalog = {
      schemaVersion: "0.1.0",
      generatedAt: "2026-08-12T00:00:00Z",
      status: "reference_cases_not_empirical_validation",
      caseCount: builtCases.length,
      historicallyScoredCaseCount: builtCases.filter(
        (built) => built.benchmark.status === "historically_scored",
      ).length,
      cases: builtCases.map(caseCatalogRecord),
    };
    await write(join(temporaryRoot, "catalog.json"), json(catalog));
    await write(
      join(temporaryRoot, "README.md"),
      `# CascadeLens reference-case library

This directory contains ${builtCases.length} executable reference cases. They exercise the complete analysis and packaging pipeline across diverse domains. They are not demonstrations of empirical accuracy: all ${builtCases.length} are currently scenario-only and zero are historically scored.

Each case includes an assumption register, context citation, sealed graph, ShockScript, model card, cascade bounds, intervention analysis, observability output, benchmark status, verified RiskPack, and rebuild command.
`,
    );
    const priorRoot = `${finalRoot}.previous`;
    await rm(priorRoot, { recursive: true, force: true });
    try {
      await rename(finalRoot, priorRoot);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
    await rename(temporaryRoot, finalRoot);
    await rm(priorRoot, { recursive: true, force: true });
    process.stdout.write(
      `Built and verified ${builtCases.length} reference cases in ${basename(finalRoot)}.\n`,
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  await buildCases(process.argv[2]);
}
