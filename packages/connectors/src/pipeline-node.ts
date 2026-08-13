import { lstat, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { sha256Text, stableStringify } from "../../core/src/canonical";
import { verifySnapshot } from "../../core/src/worldgraph";
import type { GraphSnapshot } from "../../core/src/types";
import { fetchConnectorSnapshot } from "./network";
import {
  createSnapshotManifest,
  verifySnapshotManifest,
  type ConnectorPartition,
  type DataSnapshotManifest,
} from "./manifest";
import type { ConnectorAdapter, FetchPolicy } from "./types";
import { stabilizeNormalizedFacts } from "./util";
import { normalizedSnapshotToWorldGraph } from "./worldgraph-mapping";

interface Checkpoint {
  schemaVersion: "0.1.0";
  connectorId: string;
  completed: Record<
    string,
    {
      manifestPath: string;
      normalizedPath: string;
      payloadPath: string;
      worldGraphPath: string;
    }
  >;
}

export interface NormalizedPartitionSnapshot {
  schemaVersion: "cascadelens-normalized-snapshot/1.0";
  connectorId: string;
  retrievedAt: string;
  sourceLocator: string;
  sourceManifestDigest: string;
  facts: ReturnType<typeof stabilizeNormalizedFacts>;
  contentDigest: string;
}

function safePartitionId(value: string): string {
  if (!/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(value)) {
    throw new TypeError(`Unsafe partition id ${value}.`);
  }
  return value;
}

async function atomicWrite(path: string, bytes: Uint8Array | string): Promise<void> {
  const temporary = `${path}.part-${process.pid}-${Date.now()}`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}

async function readCheckpoint(path: string, connectorId: string): Promise<Checkpoint> {
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Checkpoint;
    if (parsed.schemaVersion !== "0.1.0" || parsed.connectorId !== connectorId || !parsed.completed) {
      throw new Error("Checkpoint is incompatible with this connector plan.");
    }
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { schemaVersion: "0.1.0", connectorId, completed: {} };
  }
}

function contained(root: string, target: string): boolean {
  const offset = relative(root, target);
  return (
    offset === "" ||
    (!offset.startsWith(`..${sep}`) && offset !== ".." && !isAbsolute(offset))
  );
}

async function completedEntryIsValid(
  root: string,
  entry: {
    manifestPath: string;
    normalizedPath?: string;
    payloadPath: string;
    worldGraphPath?: string;
  },
  adapter: ConnectorAdapter<unknown>,
): Promise<boolean> {
  if (
    !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(entry.manifestPath) ||
    !entry.normalizedPath ||
    !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(entry.normalizedPath) ||
    !entry.worldGraphPath ||
    !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(entry.worldGraphPath) ||
    !/^[a-z0-9][a-z0-9._-]{1,127}$/i.test(entry.payloadPath)
  ) {
    return false;
  }
  const manifestPath = resolve(root, entry.manifestPath);
  const normalizedPath = resolve(root, entry.normalizedPath);
  const worldGraphPath = resolve(root, entry.worldGraphPath);
  const payloadPath = resolve(root, entry.payloadPath);
  if (
    !contained(root, manifestPath) ||
    !contained(root, normalizedPath) ||
    !contained(root, worldGraphPath) ||
    !contained(root, payloadPath)
  ) return false;
  try {
    const [manifestInfo, normalizedInfo, payloadInfo, worldGraphInfo, manifestBytes, normalizedBytes, worldGraphBytes, payload] = await Promise.all([
      lstat(manifestPath),
      lstat(normalizedPath),
      lstat(payloadPath),
      lstat(worldGraphPath),
      readFile(manifestPath, "utf8"),
      readFile(normalizedPath, "utf8"),
      readFile(worldGraphPath, "utf8"),
      readFile(payloadPath),
    ]);
    if (
      !manifestInfo.isFile() || manifestInfo.isSymbolicLink() ||
      !normalizedInfo.isFile() || normalizedInfo.isSymbolicLink() ||
      !payloadInfo.isFile() || payloadInfo.isSymbolicLink() ||
      !worldGraphInfo.isFile() || worldGraphInfo.isSymbolicLink()
    ) {
      return false;
    }
    const manifest = JSON.parse(manifestBytes) as DataSnapshotManifest;
    if ((await verifySnapshotManifest(manifest)).length > 0) return false;
    const descriptor = adapter.descriptor;
    const expectedRawArtifactStatus = descriptor.rawRedistributable
      ? "embedded"
      : descriptor.redistributionMode === "user_provided"
        ? "user_provided"
        : "download_on_run";
    if (
      manifest.connectorId !== descriptor.id ||
      manifest.publisher !== descriptor.publisher ||
      manifest.redistributionMode !== descriptor.redistributionMode ||
      manifest.rawArtifactStatus !== expectedRawArtifactStatus ||
      manifest.termsUri !== descriptor.termsUri ||
      manifest.checkedAt !== descriptor.checkedAt ||
      manifest.licenseName !== (descriptor.redistributionLicense?.name ?? "Source-specific terms") ||
      manifest.licenseSpdx !== descriptor.redistributionLicense?.spdx ||
      manifest.boundary !== descriptor.boundary
    ) return false;
    const normalized = JSON.parse(normalizedBytes) as NormalizedPartitionSnapshot;
    if (
      normalized.schemaVersion !== "cascadelens-normalized-snapshot/1.0" ||
      normalized.connectorId !== manifest.connectorId ||
      normalized.retrievedAt !== manifest.retrievedAt ||
      normalized.sourceManifestDigest !== manifest.manifestDigest ||
      !Array.isArray(normalized.facts) ||
      new Set(normalized.facts.map((fact) => fact.id)).size !== normalized.facts.length
    ) return false;
    const { contentDigest, ...normalizedDraft } = normalized;
    if (await sha256Text(stableStringify(normalizedDraft)) !== contentDigest) return false;
    const worldGraph = JSON.parse(worldGraphBytes) as GraphSnapshot;
    if ((await verifySnapshot(worldGraph)).some((issue) => issue.severity === "error")) {
      return false;
    }
    const recomputedWorldGraph = await normalizedSnapshotToWorldGraph(
      adapter.descriptor,
      normalized,
    );
    if (stableStringify(worldGraph) !== stableStringify(recomputedWorldGraph)) return false;
    return (
      payload.byteLength === manifest.bytes &&
      createHash("sha256").update(payload).digest("hex") === manifest.sha256
    );
  } catch {
    return false;
  }
}

export interface PipelineResult {
  connectorId: string;
  completed: string[];
  skipped: string[];
  checkpointPath: string;
}

export async function runConnectorPlan<Query>(
  adapter: ConnectorAdapter<Query>,
  partitions: ConnectorPartition<Query>[],
  outputDirectory: string,
  policy: FetchPolicy,
  secrets: Record<string, string> = {},
): Promise<PipelineResult> {
  if (partitions.length === 0 || partitions.length > 100_000) {
    throw new RangeError("Connector plans require 1-100000 bounded partitions.");
  }
  const root = resolve(outputDirectory);
  await mkdir(root, { recursive: true });
  const checkpointPath = resolve(root, "checkpoint.json");
  const checkpoint = await readCheckpoint(checkpointPath, adapter.descriptor.id);
  const seen = new Set<string>();
  const completed: string[] = [];
  const skipped: string[] = [];
  for (const partition of partitions) {
    const id = safePartitionId(partition.id);
    if (seen.has(id)) throw new Error(`Duplicate partition id ${id}.`);
    seen.add(id);
    const completedEntry = checkpoint.completed[id];
    if (completedEntry) {
      if (
        await completedEntryIsValid(
          root,
          completedEntry,
          adapter as ConnectorAdapter<unknown>,
        )
      ) {
        skipped.push(id);
        continue;
      }
      delete checkpoint.completed[id];
    }
    const request = adapter.buildRequest(partition.query, secrets);
    const snapshot = await fetchConnectorSnapshot(adapter.descriptor, request, policy);
    const manifest = await createSnapshotManifest(adapter.descriptor, snapshot);
    const facts = stabilizeNormalizedFacts(
      adapter.normalize(snapshot.payload, {
        retrievedAt: snapshot.retrievedAt,
        availableAt: snapshot.retrievedAt,
        sourceLocator: snapshot.requestUri,
      }),
    );
    if (new Set(facts.map((fact) => fact.id)).size !== facts.length) {
      throw new Error(`Connector ${adapter.descriptor.id} produced duplicate fact ids.`);
    }
    const normalizedDraft = {
      schemaVersion: "cascadelens-normalized-snapshot/1.0",
      connectorId: adapter.descriptor.id,
      retrievedAt: snapshot.retrievedAt,
      sourceLocator: snapshot.requestUri,
      sourceManifestDigest: manifest.manifestDigest,
      facts,
    } as const;
    const normalized: NormalizedPartitionSnapshot = {
      ...normalizedDraft,
      contentDigest: await sha256Text(stableStringify(normalizedDraft)),
    };
    const worldGraph = await normalizedSnapshotToWorldGraph(
      adapter.descriptor,
      normalized,
    );
    const payloadName = `${id}.payload`;
    const manifestName = `${id}.manifest.json`;
    const normalizedName = `${id}.normalized.json`;
    const worldGraphName = `${id}.worldgraph.json`;
    await atomicWrite(resolve(root, payloadName), snapshot.payload);
    await atomicWrite(
      resolve(root, manifestName),
      `${stableStringify(manifest, 2)}\n`,
    );
    await atomicWrite(
      resolve(root, normalizedName),
      `${stableStringify(normalized, 2)}\n`,
    );
    await atomicWrite(
      resolve(root, worldGraphName),
      `${stableStringify(worldGraph, 2)}\n`,
    );
    checkpoint.completed[id] = {
      manifestPath: manifestName,
      normalizedPath: normalizedName,
      payloadPath: payloadName,
      worldGraphPath: worldGraphName,
    };
    await atomicWrite(checkpointPath, `${stableStringify(checkpoint, 2)}\n`);
    completed.push(id);
  }
  return {
    connectorId: adapter.descriptor.id,
    completed,
    skipped,
    checkpointPath,
  };
}
