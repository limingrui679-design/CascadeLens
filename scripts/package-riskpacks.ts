import { mkdtemp, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { zipSync, type Zippable } from "fflate";
import { referenceCaseSpecs } from "../packages/cases/src/index";
import { stableStringify } from "../packages/core/src/index";

const root = resolve(new URL("..", import.meta.url).pathname);
const destination = join(root, "public", "riskpacks");
const fixedTime = new Date("2026-08-12T00:00:00Z");

async function packageRiskPacks(): Promise<void> {
  const temporary = await mkdtemp(join(root, "public", ".riskpacks-build-"));
  try {
    const catalog = [];
    for (const spec of referenceCaseSpecs) {
      const packRoot = join(root, "content", "cases", spec.slug, "riskpack");
      const manifest = JSON.parse(await readFile(join(packRoot, "manifest.json"), "utf8")) as {
        files: string[];
      };
      const paths = ["manifest.json", ...manifest.files, "checksums.sha256"].sort();
      const archive: Zippable = {};
      for (const path of paths) {
        const bytes = new Uint8Array(await readFile(join(packRoot, path)));
        archive[`cascadelens-${spec.slug}/${path}`] = [
          bytes,
          { mtime: fixedTime, level: 9 },
        ];
      }
      const payload = zipSync(archive, { level: 9, mtime: fixedTime });
      const name = `${spec.slug}.zip`;
      await writeFile(join(temporary, name), payload, { flag: "wx" });
      const digest = createHash("sha256").update(payload).digest("hex");
      catalog.push({ slug: spec.slug, file: name, bytes: payload.byteLength, sha256: digest });
    }
    await writeFile(
      join(temporary, "catalog.json"),
      `${stableStringify({ schemaVersion: "0.1.0", generatedAt: fixedTime.toISOString(), archives: catalog }, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    const prior = `${destination}.previous`;
    await rm(prior, { recursive: true, force: true });
    try {
      await rename(destination, prior);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await rename(temporary, destination);
    await rm(prior, { recursive: true, force: true });
    const totalBytes = await Promise.all(
      catalog.map(({ file }) => stat(join(destination, file)).then((info) => info.size)),
    );
    process.stdout.write(
      `Packaged ${catalog.length} deterministic RiskPack archives (${totalBytes.reduce((sum, value) => sum + value, 0)} bytes).\n`,
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

await packageRiskPacks();
import { createHash } from "node:crypto";
