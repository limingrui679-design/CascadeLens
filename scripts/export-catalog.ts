import { mkdir, writeFile } from "node:fs/promises";
import { connectorCatalog } from "../packages/connectors/src/catalog";
import { stableStringify } from "../packages/core/src/canonical";

await mkdir(new URL("../content/catalog/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../content/catalog/connectors.json", import.meta.url),
  `${stableStringify({ schemaVersion: "0.1.0", generatedFrom: "packages/connectors/src/catalog.ts", connectors: connectorCatalog }, 2)}\n`,
);
