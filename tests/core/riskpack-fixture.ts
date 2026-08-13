import {
  ASSUMPTION_REGISTER_DISCLAIMER,
  ASSUMPTION_REGISTER_SCHEMA_VERSION,
  analyzeInterventions,
  dependencyCascadeModelCard,
  runCascadeBounds,
  scoreReplay,
  sealSnapshot,
  sha256Text,
  stableStringify,
  type AssumptionRegister,
  type GraphSnapshotDraft,
  type ShockScenario,
} from "../../packages/core/src/index";
import { graphDraft, scenario } from "./fixtures";

export async function riskPackFixtureInputs(
  draft: GraphSnapshotDraft = graphDraft(),
  activeScenario: ShockScenario = scenario(),
) {
  const assumptionSourceId = "src:fixture-assumptions";
  const assumptions: AssumptionRegister = {
    schemaVersion: ASSUMPTION_REGISTER_SCHEMA_VERSION,
    scenarioId: activeScenario.scenarioId,
    generatedAt: activeScenario.decisionCutoff,
    status: "scenario_parameters_not_observations",
    assumptions: [
      {
        id: "assumption:fixture-transmission",
        parameterPath: "scenario.propagation.transmission",
        targetId: activeScenario.scenarioId,
        statement: "Fixture transmission parameter.",
        value: activeScenario.propagation.transmission,
        unit: "share",
        lower: 0,
        upper: 1,
        rationale: "A bounded software-verification fixture, not an observation.",
        sourceIds: [assumptionSourceId],
        status: "model_assumption",
      },
      ...draft.edges
        .filter((edge) => edge.evidence.grade === "MODEL_INFERRED")
        .map((edge, index) => ({
          id: `assumption:fixture-edge-${index + 1}`,
          parameterPath: "graph.edges[].weight" as const,
          targetId: edge.id,
          statement: `Fixture assumption for ${edge.id}.`,
          value: edge.weight.value,
          unit: edge.weight.unit,
          lower: edge.weight.lower!,
          upper: edge.weight.upper!,
          rationale: "A bounded software-verification fixture, not an observation.",
          sourceIds: [assumptionSourceId],
          status: "model_assumption" as const,
        })),
    ],
    disclaimer: ASSUMPTION_REGISTER_DISCLAIMER,
  };
  const assumptionsText = `${stableStringify(assumptions, 2)}\n`;
  const snapshot = await sealSnapshot({
    ...draft,
    sources: [
      ...draft.sources,
      {
        id: assumptionSourceId,
        title: "Fixture assumption register",
        publisher: "CascadeLens test suite",
        uri: "https://example.org/fixtures/assumptions.json",
        retrievedAt: activeScenario.decisionCutoff,
        availableAt: activeScenario.decisionCutoff,
        publishedAt: activeScenario.decisionCutoff,
        sha256: await sha256Text(assumptionsText),
        contentType: "application/json",
        artifactKind: "normalized_snapshot",
        digestScope: "exact_bytes",
        bytes: new TextEncoder().encode(assumptionsText).byteLength,
        role: "input",
        license: {
          mode: "redistributable",
          name: "CC0-1.0",
          termsUri: "https://creativecommons.org/publicdomain/zero/1.0/",
          spdx: "CC0-1.0",
        },
      },
    ],
  });
  const bounds = await runCascadeBounds(snapshot, activeScenario);
  const interventionAnalysis = await analyzeInterventions(
    snapshot,
    activeScenario,
  );
  const benchmark = scoreReplay(snapshot, activeScenario, bounds, []);
  return {
    snapshot,
    scenario: activeScenario,
    bounds,
    interventionAnalysis,
    benchmark,
    assumptions,
    modelCard: dependencyCascadeModelCard(activeScenario, benchmark),
    observationValues: [],
    rebuildCommand: `npm run cascadelens -- cases build ${activeScenario.scenarioId}`,
  };
}
