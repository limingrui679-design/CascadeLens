import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

test("re-fetches instead of trusting a missing, truncated, or mismatched checkpoint payload", async () => {
  const directory = await mkdtemp(join(tmpdir(), "cascadelens-pipeline-repair-"));
  let calls = 0;
  const partitions = [
    {
      id: "partition-000001",
      query: { reporterCode: "900", period: "2020", maxRecords: 1 },
    },
  ];
  const adapter = {
    ...unComtradeAdapter,
    descriptor: { ...unComtradeAdapter.descriptor, minimumIntervalMs: 0 },
  };
  const policy = {
    userAgent: "CascadeLens/0.1 contact@limingrui2.chatgpt.site",
    retries: 0,
    now: () => new Date("2026-08-12T00:00:00Z"),
    fetchImpl: async () => {
      calls += 1;
      return new Response('{"data":[]}');
    },
  };
  try {
    await runConnectorPlan(adapter, partitions, directory, policy);
    await rm(join(directory, "partition-000001.payload"));
    const repairedMissing = await runConnectorPlan(
      adapter,
      partitions,
      directory,
      policy,
    );
    assert.deepEqual(repairedMissing.completed, ["partition-000001"]);
    assert.equal(calls, 2);

    await writeFile(join(directory, "partition-000001.payload"), "truncated");
    const repairedMismatch = await runConnectorPlan(
      adapter,
      partitions,
      directory,
      policy,
    );
    assert.deepEqual(repairedMismatch.completed, ["partition-000001"]);
    assert.equal(calls, 3);

    const changedTermsAdapter = {
      ...adapter,
      descriptor: {
        ...adapter.descriptor,
        checkedAt: "2026-08-13",
      },
    };
    const repairedDescriptorDrift = await runConnectorPlan(
      changedTermsAdapter,
      partitions,
      directory,
      policy,
    );
    assert.deepEqual(repairedDescriptorDrift.completed, ["partition-000001"]);
    assert.equal(calls, 4);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
