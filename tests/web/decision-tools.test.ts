import assert from "node:assert/strict";
import test from "node:test";
import workbenchCatalog from "../../content/cases/workbench.json" with { type: "json" };
import { buildDecisionBrief } from "../../app/workbench/decision-brief";
import {
  computeSensitivitySurface,
  sensitivityLevels,
} from "../../app/workbench/sensitivity";
import type { WorkbenchCase } from "../../app/workbench/case-data";

const reference = workbenchCatalog.cases[0] as WorkbenchCase;
const demandReference = workbenchCatalog.cases.find(
  (item) => item.scenario.shocks[0].operation === "increase_demand",
) as WorkbenchCase;

test("decision brief preserves the analytical result and evidence boundary", () => {
  const artifact = buildDecisionBrief({
    bounds: reference.bounds,
    decisionProfile: reference.decisionProfile,
    decisionQuestion: reference.decisionQuestion,
    domain: reference.domain,
    interventions: reference.interventions,
    scenario: reference.scenario,
    slug: reference.slug,
    snapshotDigest: reference.snapshot.contentDigest,
  });
  assert.equal(artifact.filename, `${reference.slug}-decision-brief.md`);
  assert.match(artifact.text, /Status: \*\*scenario_only\*\*/);
  assert.match(artifact.text, /Decision gate: \*\*evidence_required\*\*/);
  assert.match(artifact.text, new RegExp(reference.snapshot.contentDigest));
  assert.match(artifact.text, /not a statistical confidence interval/i);
  assert.match(artifact.text, /not a forecast, causal estimate, realized loss, operational recommendation/i);
});

test("sensitivity surface recomputes every normalized-severity and transmission pair", async () => {
  const surface = await computeSensitivitySurface(reference.snapshot, reference.scenario);
  assert.equal(surface.length, sensitivityLevels.length ** 2);
  assert.equal(
    new Set(surface.map((cell) => `${cell.severity}:${cell.transmission}`)).size,
    sensitivityLevels.length ** 2,
  );
  assert.ok(surface.every((cell) => Number.isFinite(cell.impact) && cell.impact >= 0));
  for (const severity of sensitivityLevels) {
    const row = surface
      .filter((cell) => cell.severity === severity)
      .sort((left, right) => left.transmission - right.transmission);
    for (let index = 1; index < row.length; index += 1) {
      assert.ok(row[index - 1].impact <= row[index].impact + 1e-12);
    }
  }
  for (const transmission of sensitivityLevels) {
    const column = surface
      .filter((cell) => cell.transmission === transmission)
      .sort((left, right) => left.severity - right.severity);
    assert.equal(new Set(column.map((cell) => cell.impact.toFixed(12))).size, sensitivityLevels.length);
    for (let index = 1; index < column.length; index += 1) {
      assert.ok(column[index - 1].impact < column[index].impact);
    }
  }
});

test("normalized sensitivity remains finite for demand-increase operations", async () => {
  const surface = await computeSensitivitySurface(
    demandReference.snapshot,
    demandReference.scenario,
  );
  assert.equal(surface.length, sensitivityLevels.length ** 2);
  assert.ok(surface.every((cell) => Number.isFinite(cell.impact)));
  for (const transmission of sensitivityLevels) {
    const impacts = surface
      .filter((cell) => cell.transmission === transmission)
      .sort((left, right) => left.severity - right.severity)
      .map((cell) => cell.impact);
    assert.ok(impacts[0] < impacts.at(-1)!);
  }
});
