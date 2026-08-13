import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";

interface LockPackage {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  license?: string;
  dev?: boolean;
  link?: boolean;
}

interface PackageLock {
  name: string;
  version: string;
  lockfileVersion: number;
  packages: Record<string, LockPackage>;
}

const outputPath = resolve(process.argv[2] ?? "docs/release/sbom.cdx.json");
const lock = JSON.parse(await readFile("package-lock.json", "utf8")) as PackageLock;
const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
  name: string;
  version: string;
  license: string;
  releaseDate: string;
};

function deterministicUuid(seed: string): string {
  const bytes = Buffer.from(createHash("sha256").update(seed).digest().subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function sbomTimestamp(): string {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  if (epoch !== undefined) {
    if (!/^\d+$/.test(epoch)) throw new TypeError("SOURCE_DATE_EPOCH must be integer seconds.");
    return new Date(Number(epoch) * 1_000).toISOString();
  }
  const timestamp = new Date(packageJson.releaseDate);
  if (Number.isNaN(timestamp.valueOf())) throw new TypeError("package.json releaseDate must be an ISO timestamp.");
  return timestamp.toISOString();
}

const components = Object.entries(lock.packages)
  .filter(([path, item]) => path !== "" && item.version && !item.link)
  .map(([path, item]) => {
    const name = item.name ?? (
      path.includes("node_modules/")
        ? path.split("node_modules/").at(-1)!
        : path.split("/").at(-1)!
    );
    return {
      type: "library" as const,
      name,
      version: item.version!,
      scope: item.dev ? "excluded" : "required",
      purl: `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(item.version!)}`,
      licenses: item.license
        ? [{ license: { id: item.license } }]
        : undefined,
      properties: [
        { name: "cascadelens:lockPath", value: path },
        ...(item.integrity
          ? [{ name: "cascadelens:npmIntegrity", value: item.integrity }]
          : []),
        ...(item.resolved
          ? [{ name: "cascadelens:resolved", value: item.resolved }]
          : []),
      ],
    };
  })
  .sort((left, right) =>
    left.name.localeCompare(right.name) || left.version.localeCompare(right.version),
  );

const lockDigest = createHash("sha256")
  .update(await readFile("package-lock.json"))
  .digest("hex");
const serialNumber = `urn:uuid:${deterministicUuid(`${packageJson.name}:${packageJson.version}:${lockDigest}`)}`;
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber,
  version: 1,
  metadata: {
    timestamp: sbomTimestamp(),
    tools: { components: [{ type: "application", name: "CascadeLens SBOM generator", version: packageJson.version }] },
    component: {
      type: "application",
      name: packageJson.name,
      version: packageJson.version,
      licenses: [{ license: { id: packageJson.license } }],
      purl: `pkg:npm/${packageJson.name}@${packageJson.version}`,
    },
    properties: [
      { name: "cascadelens:source", value: "package-lock.json" },
      { name: "cascadelens:lockfileVersion", value: String(lock.lockfileVersion) },
      { name: "cascadelens:packageLockSha256", value: lockDigest },
    ],
  },
  components,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(sbom, null, 2)}\n`, "utf8");
console.log(`Wrote ${components.length} locked components to ${relative(process.cwd(), outputPath)}.`);
