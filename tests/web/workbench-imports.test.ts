import assert from "node:assert/strict";
import { File } from "node:buffer";
import test from "node:test";
import { JSDOM } from "jsdom";
import { runCascadeBounds, verifySnapshot } from "../../packages/core/src/index";
import { importGraphFile, starterScenario } from "../../app/workbench/imports";

test("workbench imports a CSV graph and runs a local starter", async () => {
  const file = new File(
    [
      "source,target,weight,lower,upper,source_label,target_label\n",
      "supplier,plant,0.72,0.50,0.86,Supplier,Plant\n",
      "plant,market,0.61,0.40,0.78,Plant,Market\n",
    ],
    "network.csv",
    { type: "text/csv" },
  );
  const snapshot = await importGraphFile(file as unknown as globalThis.File);
  assert.equal(snapshot.nodes.length, 3);
  assert.equal(snapshot.edges.length, 2);
  assert.deepEqual(await verifySnapshot(snapshot), []);
  const bounds = await runCascadeBounds(snapshot, starterScenario(snapshot));
  assert.ok(bounds.upper.totalWeightedImpact >= bounds.central.totalWeightedImpact);
});

test("workbench imports simple JSON without promoting its evidence", async () => {
  const file = new File(
    [JSON.stringify({
      nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      edges: [{ source: "a", target: "b", weight: 0.7 }],
    })],
    "network.json",
    { type: "application/json" },
  );
  const snapshot = await importGraphFile(file as unknown as globalThis.File);
  assert.equal(snapshot.edges[0].evidence.grade, "MODEL_INFERRED");
  assert.equal(snapshot.edges[0].properties.eligibleForPrimaryEstimate, false);
});

test("workbench imports GraphML locally", async () => {
  const original = globalThis.DOMParser;
  globalThis.DOMParser = new JSDOM("").window.DOMParser as unknown as typeof DOMParser;
  try {
    const file = new File(
      [`<?xml version="1.0"?><graphml xmlns="http://graphml.graphdrawing.org/xmlns"><key id="w" for="edge" attr.name="weight" attr.type="double"/><graph id="G" edgedefault="directed"><node id="a"/><node id="b"/><edge source="a" target="b"><data key="w">0.8</data></edge></graph></graphml>`],
      "network.graphml",
      { type: "application/graphml+xml" },
    );
    const snapshot = await importGraphFile(file as unknown as globalThis.File);
    assert.equal(snapshot.edges[0].weight.value, 0.8);
    assert.deepEqual(await verifySnapshot(snapshot), []);
  } finally {
    globalThis.DOMParser = original;
  }
});

test("workbench rejects ambiguous numeric inputs and duplicate node ids", async () => {
  const invalidWeight = new File(
    ["source,target,weight\nA,B,1.4\n"],
    "invalid.csv",
    { type: "text/csv" },
  );
  await assert.rejects(
    importGraphFile(invalidWeight as unknown as globalThis.File),
    /finite number between 0 and 1/,
  );
  const duplicateNode = new File(
    [JSON.stringify({ nodes: [{ id: "a" }, { id: "a" }], edges: [] })],
    "duplicate.json",
    { type: "application/json" },
  );
  await assert.rejects(
    importGraphFile(duplicateNode as unknown as globalThis.File),
    /Duplicate node id/,
  );
});

test("workbench rejects GraphML declarations and expands undirected graphs", async () => {
  const original = globalThis.DOMParser;
  globalThis.DOMParser = new JSDOM("").window.DOMParser as unknown as typeof DOMParser;
  try {
    const declaration = new File(
      ['<!DOCTYPE graphml [<!ENTITY x "expanded">]><graphml>&x;</graphml>'],
      "unsafe.graphml",
      { type: "application/graphml+xml" },
    );
    await assert.rejects(
      importGraphFile(declaration as unknown as globalThis.File),
      /declarations are not supported/,
    );
    const undirected = new File(
      ['<graphml xmlns="http://graphml.graphdrawing.org/xmlns"><graph edgedefault="undirected"><node id="a"/><node id="b"/><edge source="a" target="b"/></graph></graphml>'],
      "undirected.graphml",
      { type: "application/graphml+xml" },
    );
    const snapshot = await importGraphFile(undirected as unknown as globalThis.File);
    assert.equal(snapshot.edges.length, 2);
    assert.deepEqual(
      new Set(snapshot.edges.map((edge) => `${edge.from}->${edge.to}`)),
      new Set(["node:user:a->node:user:b", "node:user:b->node:user:a"]),
    );
  } finally {
    globalThis.DOMParser = original;
  }
});
