import { digestCanonical } from "./canonical";
import { assertNoErrors, type ValidationIssue } from "./errors";
import { allowedEvidenceUses, includedInBound } from "./evidence";
import { isIsoDateTime, isVisibleAt, toEpoch } from "./temporal";
import {
  evidenceGrades,
  nodeKinds,
  relationKinds,
  SCHEMA_VERSION,
  type EvidenceRecord,
  type FlowConservationIssue,
  type GraphSnapshot,
  type GraphSnapshotDraft,
  type SourceRecord,
  type TemporalRecord,
  type WorldEdge,
  type WorldNode,
} from "./types";

const sha256Pattern = /^[a-f0-9]{64}$/;
const idPattern = /^[a-z0-9][a-z0-9._:/-]{1,127}$/i;

function issue(
  issues: ValidationIssue[],
  path: string,
  code: string,
  message: string,
  severity: "error" | "warning" = "error",
): void {
  issues.push({ path, code, message, severity });
}

function validateId(
  value: string,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!idPattern.test(value)) {
    issue(issues, path, "invalid_id", "Use 2-128 URL-safe identifier characters.");
  }
}

function validateTemporal(
  value: TemporalRecord,
  path: string,
  issues: ValidationIssue[],
): void {
  for (const key of ["validFrom", "observedAt"] as const) {
    if (!isIsoDateTime(value[key])) {
      issue(issues, `${path}.${key}`, "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
    }
  }
  for (const key of ["validTo", "supersededAt"] as const) {
    const date = value[key];
    if (date !== undefined && !isIsoDateTime(date)) {
      issue(issues, `${path}.${key}`, "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
    }
  }
  if (
    isIsoDateTime(value.validFrom) &&
    value.validTo &&
    isIsoDateTime(value.validTo) &&
    toEpoch(value.validTo) <= toEpoch(value.validFrom)
  ) {
    issue(issues, `${path}.validTo`, "invalid_interval", "validTo must be after validFrom.");
  }
  if (
    isIsoDateTime(value.observedAt) &&
    value.supersededAt &&
    isIsoDateTime(value.supersededAt) &&
    toEpoch(value.supersededAt) <= toEpoch(value.observedAt)
  ) {
    issue(issues, `${path}.supersededAt`, "invalid_interval", "supersededAt must be after observedAt.");
  }
}

function validateEvidence(
  value: EvidenceRecord,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!evidenceGrades.includes(value.grade)) {
    issue(issues, `${path}.grade`, "invalid_evidence_grade", "Unknown evidence grade.");
  }
  if (!Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    issue(issues, `${path}.confidence`, "invalid_confidence", "Confidence must be between 0 and 1.");
  }
  if (!Array.isArray(value.sourceIds) || value.sourceIds.length === 0) {
    issue(issues, `${path}.sourceIds`, "missing_sources", "Evidence must cite at least one source.");
  }
  if (
    (value.grade === "TEXT_EXTRACTED" || value.grade === "MODEL_INFERRED") &&
    allowedEvidenceUses(value.grade).includes("primary")
  ) {
    issue(issues, path, "unsafe_primary_eligibility", "Extracted or inferred evidence cannot be primary.");
  }
  if (value.reviewStatus === "verified" && !value.reviewRecordId) {
    issue(issues, `${path}.reviewRecordId`, "missing_review_record", "Verified evidence requires a review record identifier.");
  }
}

function validateSource(
  source: SourceRecord,
  index: number,
  issues: ValidationIssue[],
): void {
  const path = `sources[${index}]`;
  validateId(source.id, `${path}.id`, issues);
  if (!/^https:\/\//i.test(source.uri)) {
    issue(issues, `${path}.uri`, "insecure_source_uri", "Source URI must use HTTPS.");
  }
  for (const key of ["retrievedAt", "availableAt"] as const) {
    if (!isIsoDateTime(source[key])) {
      issue(issues, `${path}.${key}`, "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
    }
  }
  if (source.publishedAt !== undefined && !isIsoDateTime(source.publishedAt)) {
    issue(issues, `${path}.publishedAt`, "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
  }
  if (
    isIsoDateTime(source.availableAt) &&
    isIsoDateTime(source.retrievedAt) &&
    toEpoch(source.availableAt) > toEpoch(source.retrievedAt)
  ) {
    issue(issues, `${path}.availableAt`, "availability_after_retrieval", "Source cannot become available after it was retrieved.");
  }
  if (!sha256Pattern.test(source.sha256)) {
    issue(issues, `${path}.sha256`, "invalid_sha256", "Expected a lowercase 64-character SHA-256 digest.");
  }
  if (![
    "raw_snapshot",
    "normalized_snapshot",
    "query_manifest",
    "citation_record",
  ].includes(source.artifactKind)) {
    issue(issues, `${path}.artifactKind`, "invalid_artifact_kind", "Unknown source artifact kind.");
  }
  if (!["exact_bytes", "canonical_record"].includes(source.digestScope)) {
    issue(issues, `${path}.digestScope`, "invalid_digest_scope", "Unknown digest scope.");
  }
  if (!/^https:\/\//i.test(source.license.termsUri)) {
    issue(issues, `${path}.license.termsUri`, "insecure_terms_uri", "License terms URI must use HTTPS.");
  }
  if (source.bytes !== undefined && (!Number.isInteger(source.bytes) || source.bytes < 0)) {
    issue(issues, `${path}.bytes`, "invalid_byte_count", "Byte count must be a non-negative integer.");
  }
}

export interface SnapshotValidationOptions {
  replay?: boolean;
  requireDigest?: boolean;
}

export function validateSnapshot(
  snapshot: GraphSnapshot | GraphSnapshotDraft,
  options: SnapshotValidationOptions = {},
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (snapshot.schemaVersion !== SCHEMA_VERSION) {
    issue(issues, "schemaVersion", "unsupported_schema", `Expected ${SCHEMA_VERSION}.`);
  }
  validateId(snapshot.snapshotId, "snapshotId", issues);
  if (!isIsoDateTime(snapshot.decisionCutoff)) {
    issue(issues, "decisionCutoff", "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
  }
  if (!isIsoDateTime(snapshot.generatedAt)) {
    issue(issues, "generatedAt", "invalid_datetime", "Expected an ISO-8601 date-time with timezone.");
  }
  const contentDigest = "contentDigest" in snapshot ? snapshot.contentDigest : undefined;
  if (options.requireDigest && !(typeof contentDigest === "string" && sha256Pattern.test(contentDigest))) {
    issue(issues, "contentDigest", "invalid_digest", "A sealed snapshot needs a SHA-256 content digest.");
  }

  const sourceIds = new Set<string>();
  snapshot.sources.forEach((source, index) => {
    validateSource(source, index, issues);
    if (sourceIds.has(source.id)) {
      issue(issues, `sources[${index}].id`, "duplicate_id", `Duplicate source id ${source.id}.`);
    }
    sourceIds.add(source.id);
    if (
      options.replay &&
      source.role !== "outcome" &&
      isIsoDateTime(source.availableAt) &&
      isIsoDateTime(snapshot.decisionCutoff) &&
      toEpoch(source.availableAt) > toEpoch(snapshot.decisionCutoff)
    ) {
      issue(issues, `sources[${index}].availableAt`, "future_source", "Replay input became publicly available after the decision cutoff.");
    }
  });

  const nodeIds = new Set<string>();
  snapshot.nodes.forEach((node, index) => {
    const path = `nodes[${index}]`;
    validateId(node.id, `${path}.id`, issues);
    validateTemporal(node, path, issues);
    validateEvidence(node.evidence, `${path}.evidence`, issues);
    if (!nodeKinds.includes(node.kind)) {
      issue(issues, `${path}.kind`, "invalid_node_kind", "Unknown node kind.");
    }
    if (nodeIds.has(node.id)) {
      issue(issues, `${path}.id`, "duplicate_id", `Duplicate node id ${node.id}.`);
    }
    nodeIds.add(node.id);
    for (const sourceId of node.evidence.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issue(issues, `${path}.evidence.sourceIds`, "unknown_source", `Unknown source ${sourceId}.`);
      }
      const source = snapshot.sources.find((item) => item.id === sourceId);
      if (source?.role === "outcome") {
        issue(issues, `${path}.evidence.sourceIds`, "outcome_leakage", "Outcome sources cannot support replay inputs.");
      }
      if (
        source &&
        node.evidence.grade !== "MODEL_INFERRED" &&
        !["raw_snapshot", "normalized_snapshot"].includes(source.artifactKind)
      ) {
        issue(issues, `${path}.evidence.sourceIds`, "insufficient_source_artifact", `${node.evidence.grade} requires a raw or normalized source snapshot.`);
      }
      if (
        source &&
        isIsoDateTime(source.availableAt) &&
        isIsoDateTime(node.observedAt) &&
        toEpoch(node.observedAt) < toEpoch(source.availableAt)
      ) {
        issue(issues, `${path}.observedAt`, "evidence_before_source", `Node predates source availability ${source.id}.`);
      }
    }
    if (
      options.replay &&
      isIsoDateTime(node.observedAt) &&
      isIsoDateTime(snapshot.decisionCutoff) &&
      toEpoch(node.observedAt) > toEpoch(snapshot.decisionCutoff)
    ) {
      issue(issues, `${path}.observedAt`, "future_evidence", "Node became observable after the decision cutoff.");
    }
  });

  const edgeIds = new Set<string>();
  snapshot.edges.forEach((edge, index) => {
    const path = `edges[${index}]`;
    validateId(edge.id, `${path}.id`, issues);
    validateTemporal(edge, path, issues);
    validateEvidence(edge.evidence, `${path}.evidence`, issues);
    if (!relationKinds.includes(edge.relation)) {
      issue(issues, `${path}.relation`, "invalid_relation", "Unknown relation kind.");
    }
    if (edgeIds.has(edge.id)) {
      issue(issues, `${path}.id`, "duplicate_id", `Duplicate edge id ${edge.id}.`);
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.from)) {
      issue(issues, `${path}.from`, "unknown_node", `Unknown from node ${edge.from}.`);
    }
    if (!nodeIds.has(edge.to)) {
      issue(issues, `${path}.to`, "unknown_node", `Unknown to node ${edge.to}.`);
    }
    if (!Number.isFinite(edge.weight.value) || edge.weight.value < 0 || edge.weight.value > 1) {
      issue(issues, `${path}.weight.value`, "invalid_weight", "Dependency weight must be between 0 and 1.");
    }
    const lower = edge.weight.lower ?? edge.weight.value;
    const upper = edge.weight.upper ?? edge.weight.value;
    if (lower < 0 || upper > 1 || lower > edge.weight.value || edge.weight.value > upper) {
      issue(issues, `${path}.weight`, "invalid_bounds", "Expected 0 <= lower <= value <= upper <= 1.");
    }
    for (const sourceId of edge.evidence.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        issue(issues, `${path}.evidence.sourceIds`, "unknown_source", `Unknown source ${sourceId}.`);
      }
      const source = snapshot.sources.find((item) => item.id === sourceId);
      if (source?.role === "outcome") {
        issue(issues, `${path}.evidence.sourceIds`, "outcome_leakage", "Outcome sources cannot support replay inputs.");
      }
      if (
        source &&
        edge.evidence.grade !== "MODEL_INFERRED" &&
        !["raw_snapshot", "normalized_snapshot"].includes(source.artifactKind)
      ) {
        issue(issues, `${path}.evidence.sourceIds`, "insufficient_source_artifact", `${edge.evidence.grade} requires a raw or normalized source snapshot.`);
      }
      if (
        source &&
        isIsoDateTime(source.availableAt) &&
        isIsoDateTime(edge.observedAt) &&
        toEpoch(edge.observedAt) < toEpoch(source.availableAt)
      ) {
        issue(issues, `${path}.observedAt`, "evidence_before_source", `Edge predates source availability ${source.id}.`);
      }
    }
    if (
      options.replay &&
      isIsoDateTime(edge.observedAt) &&
      isIsoDateTime(snapshot.decisionCutoff) &&
      toEpoch(edge.observedAt) > toEpoch(snapshot.decisionCutoff)
    ) {
      issue(issues, `${path}.observedAt`, "future_evidence", "Edge became observable after the decision cutoff.");
    }
  });

  return issues;
}

export async function sealSnapshot(
  draft: GraphSnapshotDraft,
): Promise<GraphSnapshot> {
  const normalized: GraphSnapshotDraft = {
    ...draft,
    sources: [...draft.sources].sort((a, b) => a.id.localeCompare(b.id)),
    nodes: [...draft.nodes].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...draft.edges].sort((a, b) => a.id.localeCompare(b.id)),
  };
  assertNoErrors("Invalid graph snapshot", validateSnapshot(normalized, { replay: true }));
  const contentDigest = await digestCanonical(normalized);
  return { ...normalized, contentDigest };
}

export function toSnapshotDraft(snapshot: GraphSnapshot): GraphSnapshotDraft {
  return {
    schemaVersion: snapshot.schemaVersion,
    snapshotId: snapshot.snapshotId,
    title: snapshot.title,
    decisionCutoff: snapshot.decisionCutoff,
    generatedAt: snapshot.generatedAt,
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    sources: snapshot.sources,
  };
}

export async function verifySnapshot(snapshot: GraphSnapshot): Promise<ValidationIssue[]> {
  const issues = validateSnapshot(snapshot, { replay: true, requireDigest: true });
  const actual = await digestCanonical(toSnapshotDraft(snapshot));
  if (actual !== snapshot.contentDigest) {
    issue(issues, "contentDigest", "digest_mismatch", "Snapshot content does not match its digest.");
  }
  return issues;
}

export function querySnapshot(
  snapshot: GraphSnapshot,
  validAt: string,
  knownAt: string,
): Pick<GraphSnapshot, "nodes" | "edges"> {
  const nodes = snapshot.nodes.filter((node) => isVisibleAt(node, validAt, knownAt));
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = snapshot.edges.filter(
    (edge) =>
      nodeIds.has(edge.from) &&
      nodeIds.has(edge.to) &&
      isVisibleAt(edge, validAt, knownAt),
  );
  return { nodes, edges };
}

export function selectNodes(
  snapshot: GraphSnapshot,
  target: { ids?: string[]; kind?: string; jurisdiction?: string; propertyEquals?: { key: string; value: unknown } },
): WorldNode[] {
  const ids = target.ids ? new Set(target.ids) : null;
  return snapshot.nodes.filter((node) => {
    if (ids && !ids.has(node.id)) return false;
    if (target.kind && node.kind !== target.kind) return false;
    if (target.jurisdiction && node.jurisdiction !== target.jurisdiction) return false;
    if (
      target.propertyEquals &&
      node.properties[target.propertyEquals.key] !== target.propertyEquals.value
    ) {
      return false;
    }
    return true;
  });
}

export function selectEdges(
  snapshot: GraphSnapshot,
  target: { edgeIds?: string[]; relation?: string },
): WorldEdge[] {
  const ids = target.edgeIds ? new Set(target.edgeIds) : null;
  return snapshot.edges.filter((edge) => {
    if (ids && !ids.has(edge.id)) return false;
    if (target.relation && edge.relation !== target.relation) return false;
    return true;
  });
}

export function edgeWeightForBound(edge: WorldEdge, bound: "lower" | "central" | "upper"): number {
  if (bound === "lower") return edge.weight.lower ?? edge.weight.value;
  if (bound === "upper") return edge.weight.upper ?? edge.weight.value;
  return edge.weight.value;
}

export function auditFlowConservation(
  snapshot: GraphSnapshot,
  bound: "lower" | "central" | "upper",
  tolerance = 1e-9,
): FlowConservationIssue[] {
  if (!Number.isFinite(tolerance) || tolerance < 0) {
    throw new RangeError("Conservation tolerance must be non-negative and finite.");
  }
  const relations = ["depends_on", "inputs_to", "supplies"] as const;
  const issues: FlowConservationIssue[] = [];
  const relationSet = new Set<string>(relations);
  const incomingShares = new Map<string, number>();
  for (const edge of snapshot.edges) {
    if (
      !relationSet.has(edge.relation) ||
      edge.weight.unit !== "share" ||
      !includedInBound(edge.evidence.grade, bound)
    ) {
      continue;
    }
    const key = `${edge.to}\u0000${edge.relation}`;
    incomingShares.set(
      key,
      (incomingShares.get(key) ?? 0) + edgeWeightForBound(edge, bound),
    );
  }
  for (const [key, incomingShare] of incomingShares) {
    if (incomingShare <= 1 + tolerance) continue;
    const [nodeId, relation] = key.split("\u0000") as [
      string,
      FlowConservationIssue["relation"],
    ];
    issues.push({
      nodeId,
      relation,
      bound,
      incomingShare,
      excess: incomingShare - 1,
    });
  }
  return issues.sort(
    (left, right) =>
      right.excess - left.excess ||
      left.nodeId.localeCompare(right.nodeId) ||
      left.relation.localeCompare(right.relation),
  );
}
