import assert from "node:assert/strict";
import test from "node:test";
import YAML from "yaml";
import {
  CascadeLensValidationError,
  parseShockScript,
  validateScenario,
} from "../../packages/core/src/index";
import { scenario } from "./fixtures";

test("parses a valid YAML ShockScript", () => {
  const parsed = parseShockScript(`
schemaVersion: 0.1.0
scenarioId: yaml-scenario
title: YAML scenario
summary: Parser fixture
classification: synthetic_stress
decisionCutoff: 2021-03-22T23:59:59Z
graphSnapshotId: snapshot:suez-fixture
shocks:
  - id: shock:one
    label: One shock
    target:
      ids: [route:suez]
    operation: disable
    magnitude: 1
    unit: share
    startsAt: 2021-03-23T00:00:00Z
    rationale: Parser test
    sourceIds: [src:official]
propagation:
  engine: dependency_cascade
  transmission: 0.9
  maxIterations: 100
  tolerance: 0.000001
  horizonsDays: [7]
  bounds: [lower, central, upper]
interventions: []
objectives:
  - id: objective:risk
    metric: residual_impact
    sense: minimize
constraints: {}
limitations: [Scenario only]
`);
  assert.equal(parsed.scenarioId, "yaml-scenario");
});

test("reports path-specific invalid targets", () => {
  const invalid = scenario();
  invalid.shocks[0].target = {};
  const issues = validateScenario(invalid);
  assert.ok(issues.some((issue) => issue.path === "shocks[0].target" && issue.code === "empty_target"));
});

test("enforces the ShockScript size limit", () => {
  assert.throws(() => parseShockScript("x".repeat(1_000_001)), /1 MB/);
});

test("rejects unknown and prototype-sensitive fields", () => {
  const value = scenario();
  const withUnknown = `${YAML.stringify(value)}inventedClaim: true\n`;
  assert.throws(
    () => parseShockScript(withUnknown),
    (error) =>
      error instanceof CascadeLensValidationError &&
      error.issues.some((issue) => issue.code === "unknown_field"),
  );
  const unsafe = YAML.stringify(value).replace(
    "schemaVersion: 0.1.0",
    "schemaVersion: 0.1.0\n__proto__:\n  polluted: true",
  );
  assert.throws(() => parseShockScript(unsafe), /Unsafe ShockScript key/);
});
