import { sha256Text, stableStringify } from "../../core/src/canonical";
import type {
  ConnectorDescriptor,
  ConnectorSnapshot,
} from "./types";

export interface DataSnapshotManifest {
  schemaVersion: "0.1.0";
  connectorId: string;
  publisher: string;
  requestUri: string;
  retrievedAt: string;
  contentType: string;
  bytes: number;
  sha256: string;
  redistributionMode: ConnectorDescriptor["redistributionMode"];
  rawArtifactStatus: "embedded" | "download_on_run" | "user_provided";
  termsUri: string;
  checkedAt: string;
  boundary: string;
  manifestDigest: string;
}

export interface ManifestDraft extends Omit<DataSnapshotManifest, "manifestDigest"> {
  manifestDigest?: never;
}

export async function createSnapshotManifest(
  descriptor: ConnectorDescriptor,
  snapshot: ConnectorSnapshot,
): Promise<DataSnapshotManifest> {
  if (snapshot.connectorId !== descriptor.id) {
    throw new Error("Snapshot connector id does not match its descriptor.");
  }
  const rawArtifactStatus = descriptor.rawRedistributable
    ? "embedded"
    : descriptor.redistributionMode === "user_provided"
      ? "user_provided"
      : "download_on_run";
  const draft: ManifestDraft = {
    schemaVersion: "0.1.0",
    connectorId: descriptor.id,
    publisher: descriptor.publisher,
    requestUri: snapshot.requestUri,
    retrievedAt: snapshot.retrievedAt,
    contentType: snapshot.contentType,
    bytes: snapshot.bytes,
    sha256: snapshot.sha256,
    redistributionMode: descriptor.redistributionMode,
    rawArtifactStatus,
    termsUri: descriptor.termsUri,
    checkedAt: descriptor.checkedAt,
    boundary: descriptor.boundary,
  };
  return { ...draft, manifestDigest: await sha256Text(stableStringify(draft)) };
}

export async function verifySnapshotManifest(
  manifest: DataSnapshotManifest,
): Promise<string[]> {
  const issues: string[] = [];
  if (!/^https:\/\//.test(manifest.requestUri)) issues.push("insecure_request_uri");
  if (!/^https:\/\//.test(manifest.termsUri)) issues.push("insecure_terms_uri");
  if (!/^[a-f0-9]{64}$/.test(manifest.sha256)) issues.push("invalid_payload_digest");
  if (!Number.isInteger(manifest.bytes) || manifest.bytes < 0) issues.push("invalid_byte_count");
  const { manifestDigest, ...draft } = manifest;
  const actual = await sha256Text(stableStringify(draft));
  if (actual !== manifestDigest) issues.push("manifest_digest_mismatch");
  if (manifest.redistributionMode !== "redistributable" && manifest.rawArtifactStatus === "embedded") {
    issues.push("raw_redistribution_violation");
  }
  return issues.sort();
}

export interface ConnectorPartition<Query = unknown> {
  id: string;
  query: Query;
}

export function cartesianPartitions<Query extends Record<string, string>>(
  dimensions: { [Key in keyof Query]: string[] },
  maxPartitions = 10_000,
): ConnectorPartition<Query>[] {
  if (!Number.isInteger(maxPartitions) || maxPartitions < 1 || maxPartitions > 100_000) {
    throw new RangeError("maxPartitions must be an integer from 1 to 100000.");
  }
  const entries = Object.entries(dimensions) as Array<[keyof Query, string[]]>;
  if (entries.length === 0 || entries.some(([, values]) => values.length === 0)) {
    throw new TypeError("Every partition dimension needs at least one value.");
  }
  const estimated = entries.reduce((total, [, values]) => total * values.length, 1);
  if (!Number.isSafeInteger(estimated) || estimated > maxPartitions) {
    throw new RangeError(`Partition plan would create ${estimated} requests; limit is ${maxPartitions}.`);
  }
  let queries: Query[] = [{} as Query];
  for (const [key, values] of entries) {
    queries = queries.flatMap((query) =>
      values.map((value) => ({ ...query, [key]: value })),
    );
  }
  return queries.map((query, index) => ({
    id: `partition-${String(index + 1).padStart(6, "0")}`,
    query,
  }));
}
