import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { unComtradeAdapter } from "../../packages/connectors/src/adapters/un-comtrade";
import { runConnectorPlan } from "../../packages/connectors/src/pipeline-node";

test("writes atomic partition checkpoints and resumes without re-fetching", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cascadelens-pipeline-"));
  let calls = 0;
  try {
    const partitions = [
      {
        id: "partition-000001",
        query: { reporterCode: "900", period: "2020", maxRecords: 1 },
      },
    ];
    const policy = {
      userAgent: "CascadeLens/0.1 contact@limingrui2.chatgpt.site",
      retries: 0,
      now: () => new Date("2026-08-12T00:00:00Z"),
      fetchImpl: async () => {
        calls += 1;
        return new Response('{"data":[]}');
      },
    };
    const first = await runConnectorPlan(
      { ...unComtradeAdapter, descriptor: { ...unComtradeAdapter.descriptor, minimumIntervalMs: 0 } },
      partitions,
      directory,
      policy,
    );
    assert.deepEqual(first.completed, ["partition-000001"]);
    assert.equal(calls, 1);
    const second = await runConnectorPlan(
      { ...unComtradeAdapter, descriptor: { ...unComtradeAdapter.descriptor, minimumIntervalMs: 0 } },
      partitions,
      directory,
      policy,
    );
    assert.deepEqual(second.skipped, ["partition-000001"]);
    assert.equal(calls, 1);
    const checkpoint = JSON.parse(await readFile(join(directory, "checkpoint.json"), "utf8"));
    assert.ok(checkpoint.completed["partition-000001"]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
