import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

interface Component {
  name: string;
  version: string;
  purl: string;
  properties: Array<{ name: string; value: string }>;
}

interface Sbom {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  metadata: {
    timestamp: string;
    properties: Array<{ name: string; value: string }>;
  };
  components: Component[];
}

test("publishes a deterministic CycloneDX inventory for every locked non-link package", async () => {
  const [sbomText, lockBytes, packageText] = await Promise.all([
    readFile(new URL("../../docs/release/sbom.cdx.json", import.meta.url), "utf8"),
    readFile(new URL("../../package-lock.json", import.meta.url)),
    readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ]);
  const sbom = JSON.parse(sbomText) as Sbom;
  const lock = JSON.parse(lockBytes.toString("utf8")) as {
    packages: Record<string, { link?: boolean; version?: string }>;
  };
  const packageMetadata = JSON.parse(packageText) as { releaseDate: string };
  const expectedCount = Object.entries(lock.packages).filter(
    ([path, item]) => path !== "" && item.version && !item.link,
  ).length;
  assert.equal(sbom.bomFormat, "CycloneDX");
  assert.equal(sbom.specVersion, "1.6");
  assert.match(sbom.serialNumber, /^urn:uuid:[0-9a-f-]{36}$/);
  assert.equal(sbom.metadata.timestamp, new Date(packageMetadata.releaseDate).toISOString());
  assert.equal(sbom.components.length, expectedCount);
  assert.equal(
    sbom.metadata.properties.find((item) => item.name === "cascadelens:packageLockSha256")?.value,
    createHash("sha256").update(lockBytes).digest("hex"),
  );
  const localParser = sbom.components.find(
    (item) => item.name === "image-size" && item.version === "2.0.3",
  );
  assert.ok(localParser);
  assert.equal(localParser.purl, "pkg:npm/image-size@2.0.3");
  assert.ok(
    localParser.properties.some(
      (item) => item.name === "cascadelens:lockPath" && item.value === "vendor/image-size",
    ),
  );
  assert.equal(sbom.components.some((item) => item.name === "vendor/image-size"), false);
});
