import { validateSnapshot } from "./worldgraph";
import { toEpoch } from "./temporal";
import type {
  BenchmarkResult,
  CascadeBounds,
  GraphSnapshot,
  OutcomeObservation,
  ShockScenario,
} from "./types";

function average(values: number[]): number {
  return values.length === 0
    ? Number.NaN
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ranks(values: number[]): number[] {
  const sorted = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value || a.index - b.index);
  const output = new Array<number>(values.length);
  let cursor = 0;
  while (cursor < sorted.length) {
    let end = cursor + 1;
    while (end < sorted.length && sorted[end].value === sorted[cursor].value) end += 1;
    const meanRank = (cursor + 1 + end) / 2;
    for (let index = cursor; index < end; index += 1) output[sorted[index].index] = meanRank;
    cursor = end;
  }
  return output;
}

function correlation(left: number[], right: number[]): number {
  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftSum = 0;
  let rightSum = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;
    numerator += leftDelta * rightDelta;
    leftSum += leftDelta ** 2;
    rightSum += rightDelta ** 2;
  }
  const denominator = Math.sqrt(leftSum * rightSum);
  return denominator === 0 ? 0 : numerator / denominator;
}

export function scoreReplay(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  bounds: CascadeBounds,
  outcomes: OutcomeObservation[],
): BenchmarkResult {
  const leakageIssues = validateSnapshot(snapshot, { replay: true })
    .filter((issue) => ["future_source", "future_evidence", "outcome_leakage"].includes(issue.code))
    .map((issue) => `${issue.path}: ${issue.message}`);
  const sourceById = new Map(snapshot.sources.map((source) => [source.id, source]));
  for (const [index, outcome] of outcomes.entries()) {
    const source = sourceById.get(outcome.sourceId);
    if (!source) leakageIssues.push(`outcomes[${index}]: unknown source ${outcome.sourceId}`);
    else if (source.role !== "outcome") leakageIssues.push(`outcomes[${index}]: source ${outcome.sourceId} is not outcome-only`);
    if (toEpoch(outcome.observedAt) <= toEpoch(scenario.decisionCutoff)) {
      leakageIssues.push(`outcomes[${index}]: outcome must be recorded after the decision cutoff`);
    }
    if (!Number.isFinite(outcome.observedImpact) || outcome.observedImpact < 0 || outcome.observedImpact > 1) {
      leakageIssues.push(`outcomes[${index}]: observedImpact must be between 0 and 1`);
    }
  }
  if (leakageIssues.length > 0) {
    return {
      scenarioId: scenario.scenarioId,
      classification: scenario.classification,
      status: "blocked",
      sampleSize: outcomes.length,
      leakageIssues,
      limitations: ["Benchmark scoring was blocked by temporal or source-partition violations."],
    };
  }
  if (outcomes.length === 0 || scenario.classification === "synthetic_stress") {
    return {
      scenarioId: scenario.scenarioId,
      classification: scenario.classification,
      status: "scenario_only",
      sampleSize: outcomes.length,
      leakageIssues: [],
      limitations: ["No comparable separated real-world outcome was available."],
    };
  }

  const lower = new Map(bounds.lower.impacts.map((item) => [item.nodeId, item.impact]));
  const central = new Map(bounds.central.impacts.map((item) => [item.nodeId, item.impact]));
  const upper = new Map(bounds.upper.impacts.map((item) => [item.nodeId, item.impact]));
  const comparable = outcomes.filter((item) => central.has(item.nodeId));
  if (comparable.length < 2) {
    return {
      scenarioId: scenario.scenarioId,
      classification: scenario.classification,
      status: "scenario_only",
      sampleSize: comparable.length,
      leakageIssues: [],
      limitations: ["Fewer than two comparable outcome nodes were available."],
    };
  }
  const predictions = comparable.map((item) => central.get(item.nodeId)!);
  const observed = comparable.map((item) => item.observedImpact);
  const meanAbsoluteError = average(
    predictions.map((prediction, index) => Math.abs(prediction - observed[index])),
  );
  const intervalCoverage = average(
    comparable.map((item) =>
      item.observedImpact >= (lower.get(item.nodeId) ?? 0) &&
      item.observedImpact <= (upper.get(item.nodeId) ?? 0)
        ? 1
        : 0,
    ),
  );
  const meanIntervalWidth = average(
    comparable.map(
      (item) =>
        (upper.get(item.nodeId) ?? 0) - (lower.get(item.nodeId) ?? 0),
    ),
  );
  const threshold = 0.1;
  const directionAccuracy = average(
    predictions.map((prediction, index) =>
      (prediction >= threshold) === (observed[index] >= threshold) ? 1 : 0,
    ),
  );
  const baselineAbsoluteError = average(observed.map((value) => Math.abs(value)));
  return {
    scenarioId: scenario.scenarioId,
    classification: scenario.classification,
    status: "historically_scored",
    sampleSize: comparable.length,
    meanAbsoluteError,
    spearmanRank: correlation(ranks(predictions), ranks(observed)),
    intervalCoverage,
    meanIntervalWidth,
    empiricalCoverageCalibrationError: Math.abs(1 - intervalCoverage),
    directionAccuracy,
    meanRegretVersusZeroBaseline: meanAbsoluteError - baselineAbsoluteError,
    leakageIssues: [],
    limitations: [
      "Replay metrics assess agreement with the selected outcome proxy, not causal impact or operational adoption.",
    ],
  };
}
