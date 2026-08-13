import {
  ENGINE_VERSION,
  analyzeInterventions,
  createRiskPack,
  runCascadeBounds,
  scoreReplay,
  sealSnapshot,
  sha256Text,
  stableStringify,
} from "../../packages/core/src/index";
import { graphDraft, scenario } from "../core/fixtures";

const draft = graphDraft();
draft.nodes[0] = {
  ...draft.nodes[0],
  label: "Ångström İstanbul Zürich",
  properties: {
    ...draft.nodes[0].properties,
    z: "last in ASCII",
    ä: "umlaut",
    a: "plain",
    Å: "ring",
    ı: "dotless",
    I: "latin capital",
  },
};
const snapshot = await sealSnapshot(draft);
const activeScenario = scenario();
const bounds = await runCascadeBounds(snapshot, activeScenario);
const interventions = await analyzeInterventions(snapshot, activeScenario);
const benchmark = scoreReplay(snapshot, activeScenario, bounds, []);
const pack = await createRiskPack({
  packId: "riskpack:unicode-locale-fixture",
  generatedAt: "2021-05-02T00:00:00Z",
  snapshot,
  scenario: activeScenario,
  bounds,
  interventionAnalysis: interventions,
  benchmark,
  assumptions: {
    scenarioId: activeScenario.scenarioId,
    generatedAt: activeScenario.decisionCutoff,
    status: "scenario_parameters_not_observations",
    assumptions: [],
    disclaimer: "Unicode locale fixture assumptions are not observations.",
  },
  modelCard: {
    modelId: "dependency_cascade",
    version: ENGINE_VERSION,
    intendedUse: ["Locale-independence regression"],
    outOfScope: ["Real-world decisions"],
    algorithm: "Deterministic dependency propagation.",
    evidencePolicy: "Inferred edges remain bounded.",
    validationStatus: "software_verified_empirically_unvalidated",
    limitations: ["Fixture only."],
  },
  observationValues: [],
  rebuildCommand: "npm exec -- tsx tests/fixtures/unicode-digest.ts",
});

process.stdout.write(`${stableStringify({
  canonicalBytesSha256: await sha256Text(stableStringify(draft.nodes[0].properties)),
  graphDigest: snapshot.contentDigest,
  riskPackChecksumsSha256: await sha256Text(pack.files["checksums.sha256"]),
})}\n`);
