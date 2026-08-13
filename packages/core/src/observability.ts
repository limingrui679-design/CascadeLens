import { analyzeInterventions } from "./interventions";
import { compareCanonicalStrings } from "./canonical";
import { sealSnapshot, toSnapshotDraft } from "./worldgraph";
import type {
  CandidateObservation,
  GraphSnapshot,
  ObservationValue,
  ShockScenario,
} from "./types";

function key(ids: string[]): string {
  return [...ids].sort().join("|");
}

function score(cost: number, impact: number, riskValuePerUnit: number): number {
  return cost + impact * riskValuePerUnit;
}

export async function valueObservations(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
  candidates: CandidateObservation[],
  riskValuePerUnit: number,
): Promise<ObservationValue[]> {
  if (!Number.isFinite(riskValuePerUnit) || riskValuePerUnit <= 0) {
    throw new RangeError("riskValuePerUnit must be a positive finite number.");
  }
  const absentAnalysis = await analyzeInterventions(snapshot, scenario);
  const absent = absentAnalysis.evaluatedBundles.filter(
    (item): item is typeof item & { worstCaseImpact: number } =>
      item.feasible && item.worstCaseImpact !== null,
  );
  if (absent.length === 0) {
    return candidates.map((candidate) => ({
      candidateId: candidate.id,
      label: candidate.label,
      expectedValueOfPerfectInformation: 0,
      acquisitionCost: candidate.acquisitionCost,
      netValue: -candidate.acquisitionCost,
      expectedWorstCaseImpactReduction: 0,
      expectedDecisionUncertaintyReduction: 0,
      probabilityDecisionChanges: 0,
      status: "insufficient_model",
    }));
  }

  const output: ObservationValue[] = [];
  for (const candidate of candidates) {
    const draft = toSnapshotDraft(snapshot);
    const presentSnapshot = await sealSnapshot({
      ...draft,
      edges: [
        ...snapshot.edges,
        {
          ...candidate.candidateEdge,
          properties: {
            ...candidate.candidateEdge.properties,
            counterfactualObservationBranch: true,
          },
          evidence: {
            ...candidate.candidateEdge.evidence,
            reviewStatus: "not_required",
          },
        },
      ],
    });
    const presentAnalysis = await analyzeInterventions(presentSnapshot, scenario);
    const present = presentAnalysis.evaluatedBundles.filter(
      (item): item is typeof item & { worstCaseImpact: number } =>
        item.feasible && item.worstCaseImpact !== null,
    );
    const absentByKey = new Map(absent.map((item) => [key(item.interventionIds), item]));
    const presentByKey = new Map(present.map((item) => [key(item.interventionIds), item]));
    const commonKeys = [...absentByKey.keys()].filter((item) => presentByKey.has(item));
    if (commonKeys.length === 0) {
      output.push({
        candidateId: candidate.id,
        label: candidate.label,
        expectedValueOfPerfectInformation: 0,
        acquisitionCost: candidate.acquisitionCost,
        netValue: -candidate.acquisitionCost,
        expectedWorstCaseImpactReduction: 0,
        expectedDecisionUncertaintyReduction: 0,
        probabilityDecisionChanges: 0,
        status: "insufficient_model",
      });
      continue;
    }
    const probability = Math.max(0, Math.min(1, candidate.probabilityPresent));
    const expectedScores = commonKeys.map((bundleKey) => {
      const absentBundle = absentByKey.get(bundleKey)!;
      const presentBundle = presentByKey.get(bundleKey)!;
      return {
        key: bundleKey,
        score:
          (1 - probability) * score(absentBundle.cost, absentBundle.worstCaseImpact, riskValuePerUnit) +
          probability * score(presentBundle.cost, presentBundle.worstCaseImpact, riskValuePerUnit),
      };
    });
    const exAnte = [...expectedScores].sort(
      (a, b) => a.score - b.score || compareCanonicalStrings(a.key, b.key),
    )[0];
    const absentBest = [...absent].sort(
      (a, b) =>
        score(a.cost, a.worstCaseImpact, riskValuePerUnit) -
          score(b.cost, b.worstCaseImpact, riskValuePerUnit) ||
        compareCanonicalStrings(key(a.interventionIds), key(b.interventionIds)),
    )[0];
    const presentBest = [...present].sort(
      (a, b) =>
        score(a.cost, a.worstCaseImpact, riskValuePerUnit) -
          score(b.cost, b.worstCaseImpact, riskValuePerUnit) ||
        compareCanonicalStrings(key(a.interventionIds), key(b.interventionIds)),
    )[0];
    const perfectScore =
      (1 - probability) * score(absentBest.cost, absentBest.worstCaseImpact, riskValuePerUnit) +
      probability * score(presentBest.cost, presentBest.worstCaseImpact, riskValuePerUnit);
    const value = Math.max(0, exAnte.score - perfectScore);
    const decisionChangeProbability =
      (key(absentBest.interventionIds) === exAnte.key ? 0 : 1 - probability) +
      (key(presentBest.interventionIds) === exAnte.key ? 0 : probability);
    const expectedWorstCaseImpactReduction = Math.max(
      0,
      absentBest.worstCaseImpact -
        ((1 - probability) * absentBest.worstCaseImpact +
          probability * presentBest.worstCaseImpact),
    );
    const expectedDecisionUncertaintyReduction =
      decisionChangeProbability * value;
    output.push({
      candidateId: candidate.id,
      label: candidate.label,
      expectedValueOfPerfectInformation: value,
      acquisitionCost: candidate.acquisitionCost,
      netValue: value - candidate.acquisitionCost,
      expectedWorstCaseImpactReduction,
      expectedDecisionUncertaintyReduction,
      probabilityDecisionChanges: decisionChangeProbability,
      status:
        value > candidate.acquisitionCost
          ? "worth_acquiring"
          : "not_cost_effective",
    });
  }
  return output.sort(
    (a, b) =>
      b.netValue - a.netValue ||
      compareCanonicalStrings(a.candidateId, b.candidateId),
  );
}
