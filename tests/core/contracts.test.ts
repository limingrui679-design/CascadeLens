import assert from "node:assert/strict";
import test from "node:test";
import {
  validateScenarioAgainstSnapshot,
} from "../../packages/core/src/index";
import { graphSnapshot, scenario } from "./fixtures";

test("validates scenario sources and targets against a sealed snapshot", async () => {
  assert.deepEqual(
    validateScenarioAgainstSnapshot(scenario(), await graphSnapshot()),
    [],
  );
});

test("rejects unknown targets and outcome-source leakage", async () => {
  const value = scenario();
  value.shocks[0].target.ids = ["node:missing"];
  value.shocks[0].sourceIds = ["src:outcome"];
  value.interventions[0].targetEdgeIds = ["edge:missing"];
  const codes = validateScenarioAgainstSnapshot(value, await graphSnapshot()).map(
    (issue) => issue.code,
  );
  assert.ok(codes.includes("unknown_node"));
  assert.ok(codes.includes("unknown_edge"));
  assert.ok(codes.includes("outcome_leakage"));
});
