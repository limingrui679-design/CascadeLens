import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  adapters,
  connectorCatalog,
  connectorIds,
} from "../../packages/connectors/src/index";

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
});

for (const id of connectorIds) {
  test(`${id} normalizes its synthetic contract fixture with lineage`, async () => {
    const payload = await readFile(new URL(`fixtures/${fixtures[id]}`, import.meta.url));
    const facts = adapters[id].normalize(payload, context);
    assert.ok(facts.length > 0);
    for (const fact of facts) {
      assert.match(fact.id, /^[a-z0-9][a-z0-9:._-]+$/i);
      assert.equal(fact.sourceLocator, context.sourceLocator);
      assert.equal(fact.observedAt, context.retrievedAt);
      assert.ok(fact.validFrom.endsWith("Z"));
      assert.equal(fact.evidenceGrade, adapters[id].descriptor.evidenceGrade);
    }
  });
}

test("contract fixtures are explicitly non-empirical", async () => {
  const notice = await readFile(new URL("fixtures/README.md", import.meta.url), "utf8");
  assert.match(notice, /fictional structure fixture/i);
  assert.match(notice, /not observations/i);
});
