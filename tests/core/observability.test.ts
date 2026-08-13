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
