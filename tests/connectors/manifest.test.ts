import assert from "node:assert/strict";
import test from "node:test";
import {
  cartesianPartitions,
  connectorById,
  createSnapshotManifest,
  verifySnapshotManifest,
} from "../../packages/connectors/src/index";

test("creates a self-verifying license-aware source manifest", async () => {
  const descriptor = connectorById("un-comtrade");
  const manifest = await createSnapshotManifest(descriptor, {
    connectorId: descriptor.id,
    requestUri: "https://comtradeapi.un.org/public/v1/preview/C/A/HS?reporterCode=156",
    retrievedAt: "2026-08-12T00:00:00Z",
    contentType: "application/json",
    sha256: "a".repeat(64),
    bytes: 42,
    payload: new Uint8Array(42),
  });
  assert.equal(manifest.rawArtifactStatus, "download_on_run");
  assert.deepEqual(await verifySnapshotManifest(manifest), []);
  const tampered = { ...manifest, bytes: 43 };
  assert.deepEqual(await verifySnapshotManifest(tampered), ["manifest_digest_mismatch"]);
});

test("builds deterministic bounded cartesian partition plans", () => {
  const plan = cartesianPartitions(
    { reporter: ["156", "840"], period: ["2020", "2021"] },
    4,
  );
  assert.equal(plan.length, 4);
  assert.deepEqual(plan[0], {
    id: "partition-000001",
    query: { reporter: "156", period: "2020" },
  });
  assert.throws(
    () => cartesianPartitions({ reporter: ["1", "2"], period: ["1", "2"] }, 3),
    /would create 4 requests/,
  );
});
