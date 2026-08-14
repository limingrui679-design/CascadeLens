import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  adapters,
  connectorById,
  mapConnectorSnapshotToWorldGraph,
  verifySnapshotManifest,
  type ConnectorAdapter,
  type DataSnapshotManifest,
  type NormalizedPartitionSnapshot,
} from "../../packages/connectors/src/index";
import { stabilizeNormalizedFacts } from "../../packages/connectors/src/util";
import {
  sha256Text,
  stableStringify,
  verifySnapshot,
  type GraphSnapshot,
} from "../../packages/core/src/index";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const snapshotRoot = resolve(repositoryRoot, "content/snapshots");

interface SnapshotRecord {
  slug: string;
  connectorId: string;
  retrievedAt: string;
  termsCheckedAt: string;
  licenseName: string;
  licenseSpdx: string;
  queryPath: string;
  querySha256: string;
  checkpointPath: string;
  checkpointSha256: string;
  payloadPath: string;
  manifestPath: string;
  normalizedPath: string;
  worldGraphPath: string;
  payloadBytes: number;
  payloadSha256: string;
  manifestDigest: string;
  factCount: number;
  normalizedDigest: string;
  nodeCount: number;
  edgeCount: number;
  worldGraphDigest: string;
}

test("verifies four lawfully redistributable frozen connector snapshots end to end", async () => {
  const catalog = JSON.parse(
    await readFile(resolve(snapshotRoot, "catalog.json"), "utf8"),
  ) as {
    schemaVersion: string;
    snapshotCount: number;
    factCount: number;
    dependencyEdgeCount: number;
    evidenceBoundary: string;
    snapshots: SnapshotRecord[];
  };
  assert.equal(catalog.schemaVersion, "cascadelens-public-snapshots/1.0");
  assert.equal(catalog.snapshotCount, 4);
  assert.equal(catalog.snapshots.length, 4);
  assert.match(catalog.evidenceBoundary, /not[\s\S]*historical outcomes/i);

  let totalFacts = 0;
  let totalEdges = 0;
  for (const record of catalog.snapshots) {
    const descriptor = connectorById(record.connectorId);
    const adapter = adapters[record.connectorId as keyof typeof adapters] as ConnectorAdapter<unknown>;
    assert.ok(adapter);
    assert.equal(descriptor.redistributionMode, "redistributable");
    assert.equal(descriptor.rawRedistributable, true);
    assert.equal(descriptor.redistributionLicense?.name, record.licenseName);
    assert.equal(descriptor.redistributionLicense?.spdx, record.licenseSpdx);

    const query = await readFile(resolve(snapshotRoot, record.queryPath));
    JSON.parse(query.toString("utf8"));
    assert.equal(createHash("sha256").update(query).digest("hex"), record.querySha256);
    const checkpointBytes = await readFile(resolve(snapshotRoot, record.checkpointPath));
    assert.equal(
      createHash("sha256").update(checkpointBytes).digest("hex"),
      record.checkpointSha256,
    );
    const checkpoint = JSON.parse(checkpointBytes.toString("utf8")) as {
      schemaVersion: string;
      connectorId: string;
      completed: Record<string, {
        manifestPath: string;
        normalizedPath: string;
        payloadPath: string;
        worldGraphPath: string;
      }>;
    };
    assert.equal(checkpoint.schemaVersion, "0.1.0");
    assert.equal(checkpoint.connectorId, record.connectorId);
    assert.deepEqual(checkpoint.completed, {
      "partition-000001": {
        manifestPath: record.manifestPath.split("/").at(-1),
        normalizedPath: record.normalizedPath.split("/").at(-1),
        payloadPath: record.payloadPath.split("/").at(-1),
        worldGraphPath: record.worldGraphPath.split("/").at(-1),
      },
    });
    const payload = await readFile(resolve(snapshotRoot, record.payloadPath));
    const manifest = JSON.parse(
      await readFile(resolve(snapshotRoot, record.manifestPath), "utf8"),
    ) as DataSnapshotManifest;
    const normalized = JSON.parse(
      await readFile(resolve(snapshotRoot, record.normalizedPath), "utf8"),
    ) as NormalizedPartitionSnapshot;
    const worldGraph = JSON.parse(
      await readFile(resolve(snapshotRoot, record.worldGraphPath), "utf8"),
    ) as GraphSnapshot;

    assert.deepEqual(await verifySnapshotManifest(manifest), []);
    assert.equal(manifest.retrievedAt, record.retrievedAt);
    assert.equal(manifest.checkedAt, record.termsCheckedAt);
    assert.equal(manifest.manifestDigest, record.manifestDigest);
    assert.equal(payload.byteLength, record.payloadBytes);
    assert.equal(createHash("sha256").update(payload).digest("hex"), record.payloadSha256);

    const { contentDigest, ...normalizedDraft } = normalized;
    assert.equal(await sha256Text(stableStringify(normalizedDraft)), contentDigest);
    assert.equal(contentDigest, record.normalizedDigest);
    assert.equal(normalized.facts.length, record.factCount);
    assert.equal(new Set(normalized.facts.map((fact) => fact.id)).size, record.factCount);
    assert.ok(normalized.facts.every((fact) => fact.retrievedAt === record.retrievedAt));
    assert.equal(
      stableStringify(
        stabilizeNormalizedFacts(
          adapter.normalize(payload, {
            retrievedAt: record.retrievedAt,
            availableAt: record.retrievedAt,
            sourceLocator: manifest.requestUri,
          }),
        ),
      ),
      stableStringify(normalized.facts),
    );

    assert.deepEqual(
      (await verifySnapshot(worldGraph)).filter((issue) => issue.severity === "error"),
      [],
    );
    assert.equal(worldGraph.contentDigest, record.worldGraphDigest);
    assert.equal(worldGraph.nodes.length, record.nodeCount);
    assert.equal(worldGraph.edges.length, record.edgeCount);
    assert.equal(
      stableStringify(worldGraph),
      stableStringify(await mapConnectorSnapshotToWorldGraph(adapter, normalized)),
    );
    if (record.connectorId === "bea-input-output") {
      assert.equal(worldGraph.edges.length, 222);
      assert.ok(worldGraph.edges.every((edge) => edge.relation === "inputs_to"));
      assert.ok(worldGraph.edges.every((edge) => edge.evidence.grade === "MODEL_INFERRED"));
      assert.ok(
        worldGraph.edges.every(
          (edge) => edge.properties.eligibleForPrimaryEstimate === false,
        ),
      );
    } else {
      assert.equal(worldGraph.edges.length, 0);
    }
    totalFacts += normalized.facts.length;
    totalEdges += worldGraph.edges.length;
  }
  assert.equal(totalFacts, catalog.factCount);
  assert.equal(totalEdges, catalog.dependencyEdgeCount);
});
