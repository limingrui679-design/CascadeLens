import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execute = promisify(execFile);
const repositoryRoot = resolve(new URL("../..", import.meta.url).pathname);
const tsx = resolve(repositoryRoot, "node_modules/.bin/tsx");
const runner = resolve(repositoryRoot, "tests/fixtures/unicode-digest.ts");

test("keeps canonical bytes, graph digest, and RiskPack checksums identical across four locales", async () => {
  const receipts = await Promise.all(
    ["C", "en_US.UTF-8", "sv_SE.UTF-8", "tr_TR.UTF-8"].map(async (locale) => {
      const { stdout } = await execute(tsx, [runner], {
        cwd: repositoryRoot,
        env: { ...process.env, LC_ALL: locale, LANG: locale },
      });
      return JSON.parse(stdout) as {
        canonicalBytesSha256: string;
        graphDigest: string;
        riskPackChecksumsSha256: string;
      };
    }),
  );
  assert.equal(new Set(receipts.map((item) => JSON.stringify(item))).size, 1);
  assert.deepEqual(receipts[0], {
    canonicalBytesSha256: "8b709319d33f01ceb24396b3711e1fe6c5e32e95965487a9859b98037b27e2b3",
    graphDigest: "19e28400734d60df0fc6049a5bf2ce84439f6babe49f7e6e7390b93224773ca0",
    riskPackChecksumsSha256: "428c5b2fe1772b9f7e44f459c26b007a3bb7e15b24757207c8ce0f0325ae78b1",
  });
});
