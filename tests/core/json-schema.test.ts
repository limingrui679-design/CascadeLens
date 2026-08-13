import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  createRiskPack,
} from "../../packages/core/src/index";
import { scenario } from "./fixtures";
import { riskPackFixtureInputs } from "./riskpack-fixture";

async function schema(name: string): Promise<object> {
  return JSON.parse(
    await readFile(new URL(`../../schemas/${name}`, import.meta.url), "utf8"),
  ) as object;
}

function validator(document: object) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(document);
}

test("published schemas validate live core artifacts", async () => {
  const input = await riskPackFixtureInputs();
  const pack = await createRiskPack({
    packId: "pack:schema-fixture",
    generatedAt: "2026-08-12T00:00:00Z",
    ...input,
  });
  const shockValidator = validator(await schema("shockscript-0.1.0.schema.json"));
  const graphValidator = validator(await schema("worldgraph-0.1.0.schema.json"));
  const manifestValidator = validator(await schema("riskpack-manifest-0.1.0.schema.json"));
  const assumptionValidator = validator(await schema("assumption-register-1.0.0.schema.json"));
  const modelCardValidator = validator(await schema("model-card-1.0.0.schema.json"));
  const limitationsValidator = validator(await schema("riskpack-limitations-1.0.0.schema.json"));
  assert.equal(shockValidator(input.scenario), true, JSON.stringify(shockValidator.errors));
  assert.equal(graphValidator(input.snapshot), true, JSON.stringify(graphValidator.errors));
  assert.equal(manifestValidator(pack.manifest), true, JSON.stringify(manifestValidator.errors));
  assert.equal(assumptionValidator(input.assumptions), true, JSON.stringify(assumptionValidator.errors));
  assert.equal(modelCardValidator(input.modelCard), true, JSON.stringify(modelCardValidator.errors));
  assert.equal(
    limitationsValidator(JSON.parse(pack.files["limitations.json"])),
    true,
    JSON.stringify(limitationsValidator.errors),
  );
});

test("ShockScript schema rejects unknown fields and incomplete bounds", async () => {
  const validate = validator(await schema("shockscript-0.1.0.schema.json"));
  const value = { ...scenario(), inventedClaim: true } as Record<string, unknown>;
  assert.equal(validate(value), false);
  const second = scenario();
  second.propagation.bounds = ["lower"];
  assert.equal(validate(second), false);
});
