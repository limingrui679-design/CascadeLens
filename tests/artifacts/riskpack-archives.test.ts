import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";

const catalog = JSON.parse(
  await readFile(new URL("../../public/riskpacks/catalog.json", import.meta.url), "utf8"),
) as { archives: Array<{ slug: string; file: string; bytes: number; sha256: string }> };

test("publishes sixteen deterministic, self-verifying RiskPack archives", async () => {
  assert.equal(catalog.archives.length, 16);
  for (const record of catalog.archives) {
    const archiveBytes = await readFile(
      new URL(`../../public/riskpacks/${record.file}`, import.meta.url),
    );
    assert.equal(archiveBytes.byteLength, record.bytes);
    assert.equal(createHash("sha256").update(archiveBytes).digest("hex"), record.sha256);
    const files = unzipSync(new Uint8Array(archiveBytes));
    const prefix = `cascadelens-${record.slug}/`;
    const manifest = JSON.parse(strFromU8(files[`${prefix}manifest.json`])) as { files: string[] };
    const expected = ["checksums.sha256", "manifest.json", ...manifest.files].sort();
    const actual = Object.keys(files).map((path) => path.slice(prefix.length)).sort();
    assert.deepEqual(actual, expected);
    assert.doesNotMatch(strFromU8(files[`${prefix}checksums.sha256`]), /\/(?:Users|home)\//);
    assert.doesNotMatch(strFromU8(files[`${prefix}REBUILD.txt`]), /\/(?:Users|home)\//);
  }
});
