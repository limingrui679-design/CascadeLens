import assert from "node:assert/strict";
import test from "node:test";
import {
  checksumText,
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
