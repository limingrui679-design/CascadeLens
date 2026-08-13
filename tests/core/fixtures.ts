import {
  SCHEMA_VERSION,
  sealSnapshot,
  type GraphSnapshot,
  type GraphSnapshotDraft,
  type ShockScenario,
  type WorldEdge,
  type WorldNode,
} from "../../packages/core/src/index";

const officialSource = {
  id: "src:official",
  title: "Official pre-event fixture",
  publisher: "Fixture Authority",
  uri: "https://example.org/official",
  retrievedAt: "2021-03-20T00:00:00Z",
  availableAt: "2021-03-19T00:00:00Z",
  publishedAt: "2021-03-19T00:00:00Z",
  sha256: "0".repeat(64),
  contentType: "application/json",
  artifactKind: "normalized_snapshot" as const,
  digestScope: "exact_bytes" as const,
  bytes: 1024,
  role: "input" as const,
  license: {
    mode: "redistributable" as const,
    name: "CC0-1.0",
    termsUri: "https://creativecommons.org/publicdomain/zero/1.0/",
    spdx: "CC0-1.0",
  },
};

const outcomeSource = {
  id: "src:outcome",
  title: "Separated post-event outcome fixture",
  publisher: "Fixture Authority",
  uri: "https://example.org/outcome",
  retrievedAt: "2021-05-01T00:00:00Z",
  availableAt: "2021-04-30T00:00:00Z",
  publishedAt: "2021-04-30T00:00:00Z",
  sha256: "1".repeat(64),
  contentType: "application/json",
  artifactKind: "normalized_snapshot" as const,
  digestScope: "exact_bytes" as const,
  bytes: 512,
  role: "outcome" as const,
  license: {
    mode: "redistributable" as const,
    name: "CC0-1.0",
    termsUri: "https://creativecommons.org/publicdomain/zero/1.0/",
    spdx: "CC0-1.0",
  },
};

function node(
  id: string,
  kind: WorldNode["kind"],
  label: string,
  criticality: number,
): WorldNode {
  return {
    id,
    kind,
    label,
    validFrom: "2020-01-01T00:00:00Z",
    observedAt: "2021-03-20T00:00:00Z",
    properties: { criticality, bufferShare: 0 },
    evidence: {
      grade: "OFFICIAL_OBSERVED",
      confidence: 1,
      sourceIds: [officialSource.id],
      reviewStatus: "not_required",
    },
  };
}

function edge(
  id: string,
  from: string,
  to: string,
  grade: WorldEdge["evidence"]["grade"],
  value: number,
  lower: number,
  upper: number,
): WorldEdge {
  return {
    id,
    from,
    to,
    relation: "depends_on",
    weight: { value, lower, upper, unit: "share" },
    validFrom: "2020-01-01T00:00:00Z",
    observedAt: "2021-03-20T00:00:00Z",
    properties: {},
    evidence: {
      grade,
      confidence:
        grade === "OFFICIAL_OBSERVED"
          ? 1
          : grade === "THIRD_PARTY_VERIFIED"
            ? 0.9
            : 0.5,
      sourceIds: [officialSource.id],
      reviewStatus:
        grade === "THIRD_PARTY_VERIFIED" ? "verified" : "not_required",
      reviewRecordId:
        grade === "THIRD_PARTY_VERIFIED" ? `review:${id}` : undefined,
    },
  };
}

export function graphDraft(): GraphSnapshotDraft {
  return {
    schemaVersion: SCHEMA_VERSION,
    snapshotId: "snapshot:suez-fixture",
    title: "Suez evidence fixture",
    decisionCutoff: "2021-03-22T23:59:59Z",
    generatedAt: "2021-03-22T23:59:59Z",
    sources: [officialSource, outcomeSource],
    nodes: [
      node("route:suez", "route", "Suez route", 1),
      node("product:medical", "product", "Medical supplies", 1.5),
      node("industry:hospital", "industry", "Hospital operations", 2),
      node("region:downstream", "region", "Downstream region", 1),
    ],
    edges: [
      edge(
        "edge:route-product",
        "route:suez",
        "product:medical",
        "OFFICIAL_OBSERVED",
        0.5,
        0.4,
        0.6,
      ),
      edge(
        "edge:product-industry",
        "product:medical",
        "industry:hospital",
        "THIRD_PARTY_VERIFIED",
        0.6,
        0.3,
        0.8,
      ),
      edge(
        "edge:industry-region",
        "industry:hospital",
        "region:downstream",
        "MODEL_INFERRED",
        0.5,
        0.1,
        0.7,
      ),
    ],
  };
}

export async function graphSnapshot(): Promise<GraphSnapshot> {
  return sealSnapshot(graphDraft());
}

export function scenario(): ShockScenario {
  return {
    schemaVersion: SCHEMA_VERSION,
    scenarioId: "suez-2021-fixture",
    title: "Suez 2021 fixture",
    summary: "A deterministic fixture for core engine validation.",
    classification: "historical_replay",
    decisionCutoff: "2021-03-22T23:59:59Z",
    graphSnapshotId: "snapshot:suez-fixture",
    shocks: [
      {
        id: "shock:suez-disable",
        label: "Route closure",
        target: { ids: ["route:suez"] },
        operation: "disable",
        magnitude: 1,
        unit: "share",
        startsAt: "2021-03-23T00:00:00Z",
        endsAt: "2021-03-29T00:00:00Z",
        rationale: "Exercise the propagation engine.",
        sourceIds: [officialSource.id],
      },
    ],
    propagation: {
      engine: "dependency_cascade",
      transmission: 0.9,
      maxIterations: 100,
      tolerance: 1e-9,
      horizonsDays: [7, 30, 90],
      bounds: ["lower", "central", "upper"],
    },
    interventions: [
      {
        id: "intervention:buffer-medical",
        label: "Medical inventory buffer",
        type: "buffer",
        targetNodeIds: ["product:medical"],
        targetEdgeIds: [],
        cost: 10,
        costUnit: "normalized_cost",
        leadTimeDays: 3,
        effect: 0.5,
        evidenceGrade: "OFFICIAL_OBSERVED",
        rationale: "Test a documented node buffer.",
      },
      {
        id: "intervention:diversify-input",
        label: "Diversify medical input",
        type: "diversify",
        targetNodeIds: [],
        targetEdgeIds: ["edge:product-industry"],
        cost: 15,
        costUnit: "normalized_cost",
        leadTimeDays: 7,
        effect: 0.6,
        evidenceGrade: "THIRD_PARTY_VERIFIED",
        rationale: "Test a documented dependency reduction.",
      },
    ],
    objectives: [
      { id: "objective:risk", metric: "residual_impact", sense: "minimize" },
      { id: "objective:cost", metric: "cost", sense: "minimize" },
    ],
    constraints: {
      budget: 25,
      budgetUnit: "normalized_cost",
      maxInterventions: 2,
      maxLeadTimeDays: 30,
    },
    limitations: [
      "This fixture validates software behavior and is not an empirical Suez estimate.",
    ],
  };
}

export { officialSource, outcomeSource, edge, node };
