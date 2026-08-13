import { createRiskPack, sha256Text, stableStringify } from "../../packages/core/src/index";
import { graphDraft, scenario } from "../core/fixtures";
import { riskPackFixtureInputs } from "../core/riskpack-fixture";

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
const activeScenario = scenario();
const input = await riskPackFixtureInputs(draft, activeScenario);
const pack = await createRiskPack({
  packId: "riskpack:unicode-locale-fixture",
  generatedAt: "2021-05-02T00:00:00Z",
  ...input,
});

process.stdout.write(`${stableStringify({
  canonicalBytesSha256: await sha256Text(stableStringify(draft.nodes[0].properties)),
  graphDigest: input.snapshot.contentDigest,
  riskPackChecksumsSha256: await sha256Text(pack.files["checksums.sha256"]),
})}\n`);
