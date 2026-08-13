import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDistributionAllowed,
  connectorById,
  fetchConnectorSnapshot,
  sanitizeRequestUri,
} from "../../packages/connectors/src/index";

const descriptor = {
  ...connectorById("un-comtrade"),
  minimumIntervalMs: 0,
  maxResponseBytes: 64,
};

test("redacts secrets from persisted request URIs", () => {
  const value = sanitizeRequestUri(
    "https://comtradeapi.un.org/data?subscription-key=secret&reporterCode=156",
  );
  assert.doesNotMatch(value, /secret/);
  assert.match(value, /subscription-key=REDACTED/);
  assert.match(value, /reporterCode=156/);
});

test("fetches a bounded payload and records a deterministic digest", async () => {
  let receivedAgent = "";
  const snapshot = await fetchConnectorSnapshot(
    descriptor,
    { url: "https://comtradeapi.un.org/public/v1/preview/C/A/HS?api_key=secret" },
    {
      userAgent: "CascadeLens/0.1 contact@limingrui2.chatgpt.site",
      retries: 0,
      now: () => new Date("2026-08-12T00:00:00Z"),
      fetchImpl: async (_input, init) => {
        receivedAgent = new Headers(init?.headers).get("user-agent") ?? "";
        return new Response("fixture", {
          headers: { "content-type": "application/json", "content-length": "7" },
        });
      },
    },
  );
  assert.equal(receivedAgent, "CascadeLens/0.1 contact@limingrui2.chatgpt.site");
  assert.equal(snapshot.bytes, 7);
  assert.equal(snapshot.sha256.length, 64);
  assert.doesNotMatch(snapshot.requestUri, /secret/);
  assert.equal(snapshot.retrievedAt, "2026-08-12T00:00:00.000Z");
});

test("fails closed on unapproved hosts, redirects, and oversized responses", async () => {
  const policy = {
    userAgent: "CascadeLens/0.1 contact@limingrui2.chatgpt.site",
    retries: 0,
    fetchImpl: async () => new Response("x"),
  };
  await assert.rejects(
    fetchConnectorSnapshot(descriptor, { url: "https://example.org/data" }, policy),
    /not allowed/,
  );
  await assert.rejects(
    fetchConnectorSnapshot(
      descriptor,
      { url: "https://comtradeapi.un.org/data" },
      {
        ...policy,
        fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://example.org/steal" } }),
      },
    ),
    /not allowed/,
  );
  await assert.rejects(
    fetchConnectorSnapshot(
      descriptor,
      { url: "https://comtradeapi.un.org/data" },
      {
        ...policy,
        fetchImpl: async () => new Response("x", { headers: { "content-length": "65" } }),
      },
    ),
    /limit/,
  );
});

test("requires truthful redistribution handling", () => {
  assert.throws(() => assertDistributionAllowed(descriptor, "raw"), /never|download_on_run/);
  assert.doesNotThrow(() => assertDistributionAllowed(descriptor, "manifest"));
  assert.doesNotThrow(() => assertDistributionAllowed(connectorById("faostat"), "raw"));
});

test("requires an identifying user agent", async () => {
  await assert.rejects(
    fetchConnectorSnapshot(
      descriptor,
      { url: "https://comtradeapi.un.org/data" },
      { userAgent: "example", fetchImpl: async () => new Response("ok") },
    ),
    /real identifying/,
  );
});
