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
    graphDigest: "546e6ba2828e9e4ff9a8ca61261cee67ff7aaca1de1ef3aabc220e9f973b3066",
    riskPackChecksumsSha256: "85f710079427afdf7db20a713a0848875141d392b43c157836d84ee33ebd5176",
  });
});
