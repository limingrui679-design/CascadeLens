export * from "../../core/src/index";
export * from "../../connectors/src/index";
export * from "../../cases/src/index";

import {
  analyzeInterventions,
  runCascadeBounds,
  scoreReplay,
  type GraphSnapshot,
  type OutcomeObservation,
  type ShockScenario,
} from "../../core/src/index";

/**
 * Runs the deterministic local analysis pipeline without network access.
 * Outcome observations are optional and remain separated from model inputs.
 */
export async function analyzeScenario(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  outcomes: OutcomeObservation[] = [],
) {
  const bounds = await runCascadeBounds(snapshot, scenario);
  const interventions = await analyzeInterventions(snapshot, scenario);
  const benchmark = scoreReplay(snapshot, scenario, bounds, outcomes);
  return { bounds, interventions, benchmark };
}
