import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { zipSync } from "fflate";
import {
  adapters,
  connectorCatalog,
  connectorIds,
  parseCsv,
} from "../../packages/connectors/src/index";
import { stabilizeNormalizedFacts } from "../../packages/connectors/src/util";
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
    assert.ok(facts.length >= 3, `${id} must exercise at least three distinct rows`);
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

type ConnectorId = (typeof connectorIds)[number];

const csvIds = new Set<ConnectorId>([
  "oecd-icio",
  "faostat",
  "ofac-sls",
  "unctad-lsci",
  "imf-portwatch",
]);

function csvText(rows: string[][]): Uint8Array {
  const field = (value: string) =>
    /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  return new TextEncoder().encode(
    `${rows.map((row) => row.map(field).join(",")).join("\n")}\n`,
  );
}

function reorderCsvRows(
  payload: Uint8Array,
  order: "reverse" | "rotate",
): Uint8Array {
  const [headers, ...rows] = parseCsv(new TextDecoder().decode(payload));
  const reordered =
    order === "reverse"
      ? [...rows].reverse()
      : [...rows.slice(1), rows[0]];
  return csvText([headers, ...reordered]);
}

function reorderCsvColumns(payload: Uint8Array): Uint8Array {
  const rows = parseCsv(new TextDecoder().decode(payload));
  const indices = rows[0].map((_, index) => index).reverse();
  return csvText(rows.map((row) => indices.map((index) => row[index])));
}

function jsonRows(id: ConnectorId, value: Record<string, unknown>): unknown[] {
  if (id === "un-comtrade" || id === "gleif") {
    return value.data as unknown[];
  }
  if (id === "openfda-drug-shortages") {
    return value.results as unknown[];
  }
  if (id === "world-bank-wits") {
    for (const key of ["data", "Data", "TradeStats", "WITS"]) {
      if (Array.isArray(value[key])) return value[key] as unknown[];
    }
  }
  if (id === "sec-edgar") {
    const facts = value.facts as Record<
      string,
      Record<string, { units?: Record<string, unknown[]> }>
    >;
    for (const namespace of Object.values(facts)) {
      for (const definition of Object.values(namespace)) {
        for (const records of Object.values(definition.units ?? {})) return records;
      }
    }
  }
  throw new TypeError(`No JSON row array found for ${id}`);
}

function reorderJsonRows(
  id: ConnectorId,
  payload: Uint8Array,
  order: "reverse" | "rotate",
): Uint8Array {
  const value = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
  const rows = jsonRows(id, value);
  const reordered =
    order === "reverse"
      ? [...rows].reverse()
      : [...rows.slice(1), rows[0]];
  rows.splice(0, rows.length, ...reordered);
  return new TextEncoder().encode(JSON.stringify(value));
}

function reverseObjectKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .reverse()
      .map(([key, item]) => [key, reverseObjectKeys(item)]),
  );
}

function reorderJsonFields(payload: Uint8Array): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify(
      reverseObjectKeys(JSON.parse(new TextDecoder().decode(payload))),
    ),
  );
}

function mutateJsonRows(
  id: ConnectorId,
  payload: Uint8Array,
  mode: "exact_duplicate" | "business_key_collision",
): Uint8Array {
  const value = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>;
  const rows = jsonRows(id, value);
  const duplicate = structuredClone(rows[0]) as Record<string, unknown>;
  if (mode === "business_key_collision") {
    if (id === "un-comtrade") duplicate.primaryValue = 1251;
    if (id === "world-bank-wits") duplicate.value = 77.2;
    if (id === "openfda-drug-shortages") duplicate.availability = "Fixture changed";
    if (id === "sec-edgar") duplicate.val = 124;
    if (id === "gleif") {
      const attributes = duplicate.attributes as Record<string, unknown>;
      const entity = attributes.entity as Record<string, unknown>;
      const legalName = entity.legalName as Record<string, unknown>;
      legalName.name = "Fixture Legal Entity A revised";
    }
  }
  rows.push(duplicate);
  return new TextEncoder().encode(JSON.stringify(value));
}

const csvNonKeyField: Record<ConnectorId, string | undefined> = {
  "un-comtrade": undefined,
  "oecd-icio": "OBS_VALUE",
  "sec-edgar": undefined,
  gleif: undefined,
  faostat: "Value",
  "openfda-drug-shortages": undefined,
  "ofac-sls": "Remarks",
  "world-bank-wits": undefined,
  "unctad-lsci": "Value",
  "imf-portwatch": "imports",
};

function mutateCsvRows(
  id: ConnectorId,
  payload: Uint8Array,
  mode: "exact_duplicate" | "business_key_collision",
): Uint8Array {
  const [headers, ...rows] = parseCsv(new TextDecoder().decode(payload));
  const duplicate = [...rows[0]];
  if (mode === "business_key_collision") {
    const column = csvNonKeyField[id];
    const index = column === undefined ? -1 : headers.indexOf(column);
    assert.notEqual(index, -1, `${id} collision field missing`);
    duplicate[index] = `${duplicate[index]}-changed`;
  }
  return csvText([headers, ...rows, duplicate]);
}

function normalizeFacts(id: ConnectorId, payload: Uint8Array) {
  return adapters[id]
    .normalize(payload, context)
    .map((fact) => [fact.id, stableStringify(fact)] as const)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
}

function stabilizeFacts(id: ConnectorId, payload: Uint8Array) {
  return stabilizeNormalizedFacts(adapters[id].normalize(payload, context));
}

for (const id of connectorIds) {
  test(`${id} keeps identities under reverse and rotated multi-row input`, async () => {
    const payload = await readFile(new URL(`fixtures/${fixtures[id]}`, import.meta.url));
    for (const order of ["reverse", "rotate"] as const) {
      const shuffled = csvIds.has(id)
        ? reorderCsvRows(payload, order)
        : reorderJsonRows(id, payload, order);
      assert.deepEqual(normalizeFacts(id, shuffled), normalizeFacts(id, payload));
    }
  });

  test(`${id} keeps identities when upstream field order changes`, async () => {
    const payload = await readFile(new URL(`fixtures/${fixtures[id]}`, import.meta.url));
    const reordered = csvIds.has(id)
      ? reorderCsvColumns(payload)
      : reorderJsonFields(payload);
    assert.deepEqual(normalizeFacts(id, reordered), normalizeFacts(id, payload));
  });

  test(`${id} stabilizes exact duplicates and duplicate business keys independent of row order`, async () => {
    const payload = await readFile(new URL(`fixtures/${fixtures[id]}`, import.meta.url));
    for (const mode of ["exact_duplicate", "business_key_collision"] as const) {
      const duplicated = csvIds.has(id)
        ? mutateCsvRows(id, payload, mode)
        : mutateJsonRows(id, payload, mode);
      const reversed = csvIds.has(id)
        ? reorderCsvRows(duplicated, "reverse")
        : reorderJsonRows(id, duplicated, "reverse");
      const stabilized = stabilizeFacts(id, duplicated);
      assert.equal(stabilized.length, 4);
      assert.equal(new Set(stabilized.map((fact) => fact.id)).size, 4);
      assert.deepEqual(stabilizeFacts(id, reversed), stabilized);
    }
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
