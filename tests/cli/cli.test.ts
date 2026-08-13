import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execute = promisify(execFile);
const repositoryRoot = resolve(new URL("../..", import.meta.url).pathname);
const tsx = join(repositoryRoot, "node_modules", ".bin", "tsx");
const cli = join(repositoryRoot, "packages", "cli", "src", "index.ts");
const caseRoot = join(repositoryRoot, "content", "cases", "suez-route-restress");

async function run(args: string[]) {
  return execute(tsx, [cli, ...args], {
    cwd: repositoryRoot,
    timeout: 30_000,
    maxBuffer: 10_000_000,
  });
}

test("lists twelve truthfully classified reference cases", async () => {
  const packageMetadata = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  ) as { version: string };
  const version = await run(["--version"]);
  assert.equal(version.stdout.trim(), packageMetadata.version);

  const { stdout } = await run(["cases", "list"]);
  const result = JSON.parse(stdout) as {
    status: string;
    cases: Array<{ slug: string }>;
  };
  assert.equal(result.status, "reference_cases_not_empirical_validation");
  assert.equal(result.cases.length, 12);
  assert.equal(new Set(result.cases.map((item) => item.slug)).size, 12);
});

test("validates and runs a scenario against its sealed graph", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "cascadelens-cli-run-"));
  try {
    const scenario = join(caseRoot, "scenario.json");
    const graph = join(caseRoot, "graph", "snapshot.json");
    const validation = await run(["validate", scenario, "--graph", graph]);
    assert.match(validation.stdout, /^VALID suez-route-restress \+ snapshot contract/m);

    const output = join(temporary, "result.json");
    await run(["run", scenario, "--graph", graph, "--out", output]);
    const result = JSON.parse(await readFile(output, "utf8")) as {
      status: string;
      benchmark: { status: string };
    };
    assert.equal(result.status, "scenario_output_not_empirical_validation");
    assert.equal(result.benchmark.status, "scenario_only");
    await assert.rejects(run(["run", scenario, "--graph", graph, "--out", output]));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("packs, independently verifies, and detects tampering", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "cascadelens-cli-pack-"));
  try {
    const output = join(temporary, "riskpack");
    await run([
      "pack",
      join(caseRoot, "scenario.json"),
      "--graph",
      join(caseRoot, "graph", "snapshot.json"),
      "--assumptions",
      join(caseRoot, "assumptions.json"),
      "--model-card",
      join(caseRoot, "model-card.json"),
      "--observation-candidates",
      join(caseRoot, "riskpack", "inputs", "observation-candidates.json"),
      "--out",
      output,
    ]);
    const verified = await run(["verify", output]);
    assert.match(verified.stdout, /^VERIFIED /m);
    assert.doesNotMatch(await readFile(join(output, "REBUILD.txt"), "utf8"), /\/Users\//);

    await writeFile(join(output, "limitations.json"), "{}\n", "utf8");
    await assert.rejects(
      run(["verify", output]),
      (error: unknown) =>
        error instanceof Error && /checksum_mismatch:limitations\.json/.test(error.message),
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("rejects unknown commands, duplicate flags, and path-like checksum entries", async () => {
  await assert.rejects(run(["unknown"]));
  await assert.rejects(
    run([
      "validate",
      join(caseRoot, "scenario.json"),
      "--graph",
      join(caseRoot, "graph", "snapshot.json"),
      "--graph",
      join(caseRoot, "graph", "snapshot.json"),
    ]),
  );
  const temporary = await mkdtemp(join(tmpdir(), "cascadelens-cli-path-"));
  try {
    const output = join(temporary, "riskpack");
    await run([
      "pack",
      join(caseRoot, "scenario.json"),
      "--graph",
      join(caseRoot, "graph", "snapshot.json"),
      "--assumptions",
      join(caseRoot, "assumptions.json"),
      "--model-card",
      join(caseRoot, "model-card.json"),
      "--observation-candidates",
      join(caseRoot, "riskpack", "inputs", "observation-candidates.json"),
      "--out",
      output,
    ]);
    const checksums = await readFile(join(output, "checksums.sha256"), "utf8");
    await writeFile(
      join(output, "checksums.sha256"),
      `${checksums}${"0".repeat(64)}  /Users/example/secret\n`,
      "utf8",
    );
    await assert.rejects(run(["verify", output]));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("prints actionable validation paths and codes without echoing input values", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "cascadelens-cli-errors-"));
  try {
    const invalidPath = join(temporary, "invalid.json");
    const source = JSON.parse(
      await readFile(join(caseRoot, "scenario.json"), "utf8"),
    ) as Record<string, unknown>;
    source.inventedSecretField = "sensitive-value-must-not-be-echoed";
    await writeFile(invalidPath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
    await assert.rejects(
      run(["validate", invalidPath]),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, /inventedSecretField \[unknown_field\]/);
        assert.doesNotMatch(message, /sensitive-value-must-not-be-echoed/);
        return true;
      },
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
