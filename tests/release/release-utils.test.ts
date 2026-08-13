import assert from "node:assert/strict";
import test from "node:test";
import { zipSync } from "fflate";
import {
  checksumText,
  inspectTarListing,
  inspectZipArchive,
  parseChecksums,
  safeReleasePath,
} from "../../scripts/release-utils";

test("accepts framework route segments while rejecting traversal and absolute paths", () => {
  assert.equal(safeReleasePath.test("cascadelens-0.1.0/app/cases/[slug]/page.tsx"), true);
  assert.equal(safeReleasePath.test("cascadelens-0.1.0/.openai/hosting.json"), true);
  assert.equal(safeReleasePath.test("/etc/passwd"), false);
  assert.equal(safeReleasePath.test("cascadelens/../secret"), false);
  assert.equal(safeReleasePath.test("cascadelens/../../secret"), false);
  assert.equal(safeReleasePath.test("cascadelens\\..\\secret"), false);
  assert.equal(safeReleasePath.test("cascadelens/$HOME/secret"), false);
});

test("enforces archive entry, expansion, compression-ratio, and nested budgets", () => {
  const normal = zipSync({
    "cascadelens-0.1.2/README.md": new TextEncoder().encode("bounded"),
  });
  assert.equal(inspectZipArchive(normal).entries, 1);
  const nested = zipSync({
    "riskpack.zip": zipSync({ "result.json": new TextEncoder().encode("{}") }),
  });
  assert.throws(
    () => inspectZipArchive(nested, undefined, true),
    /Nested archive depth/,
  );
  const compressed = zipSync({
    "large.txt": new Uint8Array(10_000).fill(65),
  });
  assert.throws(
    () => inspectZipArchive(compressed, {
      maxEntries: 10,
      maxEntryBytes: 20_000,
      maxTotalExpandedBytes: 20_000,
      maxCompressionRatio: 2,
    }),
    /compression ratio/,
  );
  assert.throws(
    () => inspectTarListing(
      "-rw-r--r-- 0 root root 1000 Aug 13 00:00 safe/file.txt",
      10,
      {
        maxEntries: 10,
        maxEntryBytes: 2_000,
        maxTotalExpandedBytes: 2_000,
        maxCompressionRatio: 2,
      },
    ),
    /compression ratio/,
  );
});

test("parses only canonical relative release checksums", () => {
  const checksums = {
    "cascadelens-0.1.0.tar.gz": "a".repeat(64),
    "release-manifest.json": "b".repeat(64),
  };
  const text = checksumText(checksums);
  assert.deepEqual({ ...parseChecksums(text) }, checksums);
  assert.throws(
    () => parseChecksums(`${"a".repeat(64)}  ../outside\n`),
    /Invalid release checksum line/,
  );
  assert.throws(
    () => parseChecksums(`${"a".repeat(64)}  duplicate\n${"b".repeat(64)}  duplicate\n`),
    /Duplicate release checksum path/,
  );
});
