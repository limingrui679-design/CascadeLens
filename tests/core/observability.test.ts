import assert from "node:assert/strict";
import test from "node:test";
import { valueObservations } from "../../packages/core/src/index";
import { edge, graphSnapshot, scenario } from "./fixtures";

test("values a missing edge without promoting it to observed evidence", async () => {
  const snapshot = await graphSnapshot();
  const candidateEdge = edge(
    "edge:candidate-route-region",
    "route:suez",
    "region:downstream",
    "MODEL_INFERRED",
    0.7,
    0.2,
    0.9,
  );
  const values = await valueObservations(
    snapshot,
    scenario(),
    [
      {
        id: "candidate:route-region",
        label: "Verify route-to-region exposure",
        candidateEdge,
        probabilityPresent: 0.5,
        acquisitionCost: 0.01,
        acquisitionCostUnit: "normalized_cost",
      },
    ],
    100,
  );
  assert.equal(values.length, 1);
  assert.ok(values[0].expectedValueOfPerfectInformation >= 0);
  assert.ok(values[0].expectedWorstCaseImpactReduction >= 0);
  assert.ok(values[0].expectedDecisionUncertaintyReduction >= 0);
  assert.equal(snapshot.edges.some((item) => item.id === candidateEdge.id), false);
  assert.equal(candidateEdge.evidence.grade, "MODEL_INFERRED");
  assert.equal(candidateEdge.evidence.reviewStatus, "not_required");
});

test("prices evidence that can change the preferred intervention and applies acquisition cost", async () => {
  const snapshot = await graphSnapshot();
  const candidateEdge = edge(
    "edge:candidate-feedback",
    "industry:hospital",
    "product:medical",
    "MODEL_INFERRED",
    0.3,
    0.3,
    0.3,
  );
  const candidate = {
    id: "candidate:feedback",
    label: "Verify a possible feedback dependency",
    candidateEdge,
    probabilityPresent: 0.5,
    acquisitionCost: 0.01,
    acquisitionCostUnit: "normalized_cost",
  };

  const [worthAcquiring] = await valueObservations(
    snapshot,
    scenario(),
    [candidate],
    800,
  );
  assert.equal(worthAcquiring.status, "worth_acquiring");
  assert.equal(worthAcquiring.probabilityDecisionChanges, 0.5);
  assert.ok(worthAcquiring.expectedValueOfPerfectInformation > candidate.acquisitionCost);
  assert.equal(
    worthAcquiring.netValue,
    worthAcquiring.expectedValueOfPerfectInformation - candidate.acquisitionCost,
  );

  const [tooExpensive] = await valueObservations(
    snapshot,
    scenario(),
    [{ ...candidate, acquisitionCost: worthAcquiring.expectedValueOfPerfectInformation + 1 }],
    800,
  );
  assert.equal(tooExpensive.status, "not_cost_effective");
  assert.equal(
    tooExpensive.expectedValueOfPerfectInformation,
    worthAcquiring.expectedValueOfPerfectInformation,
  );
  assert.ok(tooExpensive.netValue < 0);
  assert.equal(snapshot.edges.some((item) => item.id === candidateEdge.id), false);
});

test("rejects a non-positive risk valuation", async () => {
  const snapshot = await graphSnapshot();
  const candidateEdge = edge(
    "edge:candidate-invalid-value",
    "industry:hospital",
    "product:medical",
    "MODEL_INFERRED",
    0.3,
    0.3,
    0.3,
  );
  await assert.rejects(
    valueObservations(
      snapshot,
      scenario(),
      [{
        id: "candidate:invalid-value",
        label: "Invalid valuation fixture",
        candidateEdge,
        probabilityPresent: 0.5,
        acquisitionCost: 0.01,
        acquisitionCostUnit: "normalized_cost",
      }],
      0,
    ),
    /riskValuePerUnit must be a positive finite number/,
  );
});
