import {
  SCHEMA_VERSION,
  compareCanonicalStrings,
  digestCanonical,
  sealSnapshot,
  stableStringify,
  type GraphSnapshot,
  type WorldNode,
} from "../../core/src/index";
import type { ConnectorDescriptor } from "./types";
import type {
  ConnectorAdapter,
  NormalizedConnectorSnapshot,
} from "./types";

function metricLabel(kind: string, dimensions: Record<string, string>): string {
  const detail = Object.entries(dimensions)
    .sort(([left], [right]) => compareCanonicalStrings(left, right))
    .map(([, value]) => value)
    .filter(Boolean)
    .slice(0, 3)
    .join(" · ");
  return detail ? `${kind}: ${detail}` : kind;
}

/**
 * A conservative generic mapping: every normalized fact becomes a metric node.
 * No dependency edge is invented. Domain-specific topology remains a separate,
 * reviewable mapping step.
 */
export async function normalizedSnapshotToWorldGraph(
  descriptor: ConnectorDescriptor,
  normalized: NormalizedConnectorSnapshot,
): Promise<GraphSnapshot> {
  if (descriptor.id !== normalized.connectorId) {
    throw new TypeError("Normalized snapshot connector does not match its descriptor.");
  }
  if (!/^https:\/\//i.test(normalized.sourceLocator)) {
    throw new TypeError("WorldGraph source lineage requires an HTTPS source locator.");
  }
  const sourceId = `connector-source:${descriptor.id}:${normalized.contentDigest.slice(0, 16)}`;
  const nodes: WorldNode[] = await Promise.all(
    normalized.facts.map(async (item) => ({
      id: `connector-fact:${descriptor.id}:${(await digestCanonical(item)).slice(0, 32)}`,
      kind: "metric" as const,
      label: metricLabel(item.kind, item.dimensions),
      description:
        "Connector-normalized fact. No dependency topology is inferred by this generic mapping.",
      validFrom: item.validFrom,
      validTo: item.validTo,
      observedAt: item.observedAt,
      properties: {
        connectorId: descriptor.id,
        normalizedFactId: item.id,
        factKind: item.kind,
        dimensions: item.dimensions,
        measures: item.measures,
        attributes: item.attributes,
        publishedAt: item.publishedAt ?? null,
        availableAt: item.availableAt,
        retrievedAt: item.retrievedAt,
        mappingStatus: "normalized_fact_without_inferred_topology",
      },
      evidence: {
        grade: item.evidenceGrade,
        confidence: item.evidenceGrade === "OFFICIAL_OBSERVED" ? 1 : 0.9,
        sourceIds: [sourceId],
        reviewStatus: "not_required" as const,
      },
    })),
  );
  const bytes = new TextEncoder().encode(stableStringify(normalized)).byteLength;
  return sealSnapshot({
    schemaVersion: SCHEMA_VERSION,
    snapshotId: `connector-snapshot:${descriptor.id}:${normalized.contentDigest.slice(0, 16)}`,
    title: `${descriptor.name} normalized fact snapshot`,
    decisionCutoff: normalized.retrievedAt,
    generatedAt: normalized.retrievedAt,
    sources: [
      {
        id: sourceId,
        title: `${descriptor.name} normalized snapshot`,
        publisher: descriptor.publisher,
        uri: normalized.sourceLocator,
        retrievedAt: normalized.retrievedAt,
        availableAt: normalized.retrievedAt,
        sha256: normalized.contentDigest,
        contentType: "application/json",
        artifactKind: "normalized_snapshot",
        digestScope: "canonical_record",
        bytes,
        role: "input",
        license: {
          mode: descriptor.redistributionMode,
          name: descriptor.redistributionLicense?.name ?? "Source-specific terms",
          termsUri: descriptor.termsUri,
          spdx: descriptor.redistributionLicense?.spdx,
          notes: descriptor.licenseNotes.join(" "),
        },
      },
    ],
    nodes,
    edges: [],
  });
}

export async function mapConnectorSnapshotToWorldGraph(
  adapter: ConnectorAdapter<unknown>,
  normalized: NormalizedConnectorSnapshot,
): Promise<GraphSnapshot> {
  return adapter.mapToWorldGraph
    ? adapter.mapToWorldGraph(normalized)
    : normalizedSnapshotToWorldGraph(adapter.descriptor, normalized);
}
