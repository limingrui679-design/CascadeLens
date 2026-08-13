import assert from "node:assert/strict";
import test from "node:test";
import {
  canUseEvidence,
  querySnapshot,
  sealSnapshot,
  verifySnapshot,
} from "../../packages/core/src/index";
import { graphDraft, graphSnapshot } from "./fixtures";

test("seals a snapshot deterministically regardless of collection order", async () => {
  const first = await sealSnapshot(graphDraft());
  const draft = graphDraft();
  const second = await sealSnapshot({
    ...draft,
    nodes: [...draft.nodes].reverse(),
    edges: [...draft.edges].reverse(),
    sources: [...draft.sources].reverse(),
  });
  assert.equal(first.contentDigest, second.contentDigest);
  assert.deepEqual(first.nodes.map((node) => node.id), [...first.nodes.map((node) => node.id)].sort());
});

test("seals Unicode content identically without locale-sensitive ordering", async () => {
  const draft = graphDraft();
  draft.nodes[0] = {
    ...draft.nodes[0],
    label: "Ångström İstanbul Zürich",
    properties: {
      ...draft.nodes[0].properties,
      z: "last in ASCII",
      ä: "umlaut",
      a: "plain",
      Å: "ring",
      ı: "dotless",
      I: "latin capital",
    },
  };
  const first = await sealSnapshot(draft);
  const reordered = graphDraft();
  reordered.nodes[0] = {
    ...draft.nodes[0],
    properties: Object.fromEntries(Object.entries(draft.nodes[0].properties).reverse()),
  };
  const second = await sealSnapshot(reordered);
  assert.equal(first.contentDigest, second.contentDigest);
  assert.equal(
    first.contentDigest,
    "19e28400734d60df0fc6049a5bf2ce84439f6babe49f7e6e7390b93224773ca0",
  );
});

test("detects snapshot tampering", async () => {
  const snapshot = await graphSnapshot();
  const tampered = structuredClone(snapshot);
  tampered.edges[0].weight.value = 0.2;
  const issues = await verifySnapshot(tampered);
  assert.ok(issues.some((issue) => issue.code === "digest_mismatch"));
});

test("filters a bitemporal snapshot by both validity and knowledge", async () => {
  const snapshot = await graphSnapshot();
  const hidden = structuredClone(snapshot);
  hidden.nodes[0].observedAt = "2021-03-21T00:00:00Z";
  const early = querySnapshot(hidden, "2021-03-23T00:00:00Z", "2021-03-20T12:00:00Z");
  assert.equal(early.nodes.some((node) => node.id === hidden.nodes[0].id), false);
  const later = querySnapshot(hidden, "2021-03-23T00:00:00Z", "2021-03-21T12:00:00Z");
  assert.equal(later.nodes.some((node) => node.id === hidden.nodes[0].id), true);
});

test("never makes extracted or inferred evidence primary", () => {
  assert.equal(canUseEvidence("TEXT_EXTRACTED", "primary"), false);
  assert.equal(canUseEvidence("MODEL_INFERRED", "primary"), false);
  assert.equal(canUseEvidence("MODEL_INFERRED", "bounded"), true);
});

test("rejects future replay input evidence", async () => {
  const draft = graphDraft();
  draft.sources[0] = {
    ...draft.sources[0],
    availableAt: "2021-03-24T00:00:00Z",
    retrievedAt: "2021-03-25T00:00:00Z",
  };
  await assert.rejects(() => sealSnapshot(draft), /Invalid graph snapshot/);
});

test("allows later archival retrieval when the exact source version was already available", async () => {
  const draft = graphDraft();
  draft.sources[0] = {
    ...draft.sources[0],
    retrievedAt: "2026-08-12T00:00:00Z",
  };
  await assert.doesNotReject(() => sealSnapshot(draft));
});

test("rejects evidence timestamps that precede their supporting source", async () => {
  const draft = graphDraft();
  draft.nodes[0] = {
    ...draft.nodes[0],
    observedAt: "2021-03-18T00:00:00Z",
  };
  await assert.rejects(() => sealSnapshot(draft), /Invalid graph snapshot/);
});

test("does not treat a citation record as observed quantitative evidence", async () => {
  const draft = graphDraft();
  draft.sources[0] = {
    ...draft.sources[0],
    artifactKind: "citation_record",
    digestScope: "canonical_record",
  };
  await assert.rejects(() => sealSnapshot(draft), /Invalid graph snapshot/);
});
