import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { zipSync } from "fflate";
import {
  adapters,
  connectorCatalog,
  connectorIds,
} from "../../packages/connectors/src/index";
import { stableStringify } from "../../packages/core/src/index";

const fixtures: Record<(typeof connectorIds)[number], string> = {
  "un-comtrade": "un-comtrade.json",
  "oecd-icio": "oecd-icio.csv",
  "sec-edgar": "sec-companyfacts.json",
  gleif: "gleif.json",
  faostat: "faostat.csv",
  "openfda-drug-shortages": "openfda.json",
  "ofac-sls": "ofac.csv",
  "world-bank-wits": "wits.json",
  "unctad-lsci": "unctad-lsci.csv",
  "imf-portwatch": "imf-portwatch.csv",
};

const context = {
  retrievedAt: "2026-08-12T00:00:00Z",
  sourceLocator: "fixture://synthetic-contract",
};

test("catalog and adapter registry cover exactly ten core connectors", () => {
  assert.equal(connectorCatalog.length, 10);
  assert.deepEqual(
    Object.keys(adapters).sort(),
    [...connectorIds].sort(),
  );
  assert.ok(connectorCatalog.some((item) => item.redistributionMode === "redistributable"));
  assert.ok(connectorCatalog.some((item) => item.redistributionMode === "download_on_run"));
  assert.ok(connectorCatalog.some((item) => item.redistributionMode === "user_provided"));
  for (const descriptor of connectorCatalog.filter((item) => item.rawRedistributable)) {
    assert.equal(descriptor.redistributionMode, "redistributable");
    assert.ok(descriptor.redistributionLicense?.name);
    assert.match(descriptor.redistributionLicense?.spdx ?? "", /^[A-Za-z0-9-.+]+$/);
  }
});

for (const id of connectorIds) {
  test(`${id} normalizes its synthetic contract fixture with lineage`, async () => {
    const payload = await readFile(new URL(`fixtures/${fixtures[id]}`, import.meta.url));
    const facts = adapters[id].normalize(payload, context);
    assert.ok(facts.length > 0);
    for (const fact of facts) {
      assert.match(fact.id, /^[a-z0-9][a-z0-9:._-]+$/i);
      assert.ok(fact.id.length <= 127, `${id} fact id exceeds the public id bound`);
      assert.equal(fact.sourceLocator, context.sourceLocator);
      assert.equal(fact.retrievedAt, context.retrievedAt);
      assert.equal(fact.availableAt, context.retrievedAt);
      assert.equal(fact.observedAt, context.retrievedAt);
      assert.notEqual(fact.validFrom, undefined);
      assert.ok(fact.validFrom.endsWith("Z"));
      assert.equal(fact.evidenceGrade, adapters[id].descriptor.evidenceGrade);
    }
  });
}

function reverseCsv(payload: Uint8Array): Uint8Array {
  const lines = new TextDecoder().decode(payload).trimEnd().split("\n");
  return new TextEncoder().encode(
    `${[lines[0], ...lines.slice(1).reverse()].join("\n")}\n`,
  );
}

function reverseJsonRows(id: (typeof connectorIds)[number], payload: Uint8Array): Uint8Array {
  const value = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
  if (id === "un-comtrade" && Array.isArray(value.data)) value.data.reverse();
  if (id === "openfda-drug-shortages" && Array.isArray(value.results)) value.results.reverse();
  if (id === "gleif" && Array.isArray(value.data)) value.data.reverse();
  if (id === "world-bank-wits") {
    for (const key of ["data", "Data", "TradeStats", "WITS"]) {
      if (Array.isArray(value[key])) (value[key] as unknown[]).reverse();
    }
  }
  if (id === "sec-edgar") {
    const facts = value.facts as Record<string, Record<string, { units?: Record<string, unknown[]> }>> | undefined;
    for (const namespace of Object.values(facts ?? {})) {
      for (const definition of Object.values(namespace)) {
        for (const records of Object.values(definition.units ?? {})) records.reverse();
      }
    }
  }
  return new TextEncoder().encode(JSON.stringify(value));
}

for (const id of connectorIds) {
  test(`${id} keeps the same fact identities when upstream rows are shuffled`, async () => {
    const payload = await readFile(new URL(`fixtures/${fixtures[id]}`, import.meta.url));
    const shuffled = [
      "oecd-icio",
      "faostat",
      "ofac-sls",
      "unctad-lsci",
      "imf-portwatch",
    ].includes(id)
      ? reverseCsv(payload)
      : reverseJsonRows(id, payload);
    const normalize = (bytes: Uint8Array) =>
      adapters[id]
        .normalize(bytes, context)
        .map((fact) => [fact.id, stableStringify(fact)] as const)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
    assert.deepEqual(normalize(shuffled), normalize(payload));
  });
}

test("contract fixtures are explicitly non-empirical", async () => {
  const notice = await readFile(new URL("fixtures/README.md", import.meta.url), "utf8");
  assert.match(notice, /fictional structure fixture/i);
  assert.match(notice, /not observations/i);
});

test("FAOSTAT accepts one bounded CSV in ZIP and rejects ambiguous or nested archives", async () => {
  const csv = await readFile(new URL("fixtures/faostat.csv", import.meta.url));
  const plain = adapters.faostat.normalize(csv, context);
  const zipped = adapters.faostat.normalize(
    zipSync({ "FAOSTAT_data_(Normalized).csv": csv }),
    context,
  );
  assert.deepEqual(zipped, plain);
  assert.deepEqual(
    adapters.faostat.normalize(
      zipSync({
        "FAOSTAT_E_All_Data_(Normalized).csv": csv,
        "FAOSTAT_E_Flags.csv": new TextEncoder().encode("code,label\nA,Official\n"),
      }),
      context,
    ),
    plain,
  );
  assert.throws(
    () => adapters.faostat.normalize(
      zipSync({ "first.csv": csv, "second.csv": csv }),
      context,
    ),
    /exactly one unambiguous data CSV/,
  );
  assert.throws(
    () => adapters.faostat.normalize(
      zipSync({ "nested.zip": zipSync({ "data.csv": csv }) }),
      context,
    ),
    /Nested archive/,
  );
  assert.throws(
    () => adapters.faostat.normalize(
      zipSync({ "../escape.csv": csv }),
      context,
    ),
    /Unsafe ZIP path/,
  );
});
