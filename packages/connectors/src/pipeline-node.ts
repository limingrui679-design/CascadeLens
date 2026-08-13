import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stableStringify } from "../../core/src/canonical";
import { fetchConnectorSnapshot } from "./network";
import { createSnapshotManifest, type ConnectorPartition } from "./manifest";
import type { ConnectorAdapter, FetchPolicy } from "./types";

interface Checkpoint {
  schemaVersion: "0.1.0";
  connectorId: string;
  completed: Record<string, { manifestPath: string; payloadPath: string }>;
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
    if (checkpoint.completed[id]) {
      skipped.push(id);
      continue;
    }
    const request = adapter.buildRequest(partition.query, secrets);
    const snapshot = await fetchConnectorSnapshot(adapter.descriptor, request, policy);
    const manifest = await createSnapshotManifest(adapter.descriptor, snapshot);
    const payloadName = `${id}.payload`;
    const manifestName = `${id}.manifest.json`;
    await atomicWrite(resolve(root, payloadName), snapshot.payload);
    await atomicWrite(
      resolve(root, manifestName),
      `${stableStringify(manifest, 2)}\n`,
    );
    checkpoint.completed[id] = {
      manifestPath: manifestName,
      payloadPath: payloadName,
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
