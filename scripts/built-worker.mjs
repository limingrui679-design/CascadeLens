import { fileURLToPath } from "node:url";
import { createTestHarness } from "wrangler";

/** Exercise the built entry point and bindings in the local Workers runtime. */
export async function startBuiltWorker() {
  const configPath = fileURLToPath(new URL("../dist/server/wrangler.json", import.meta.url));
  const harness = createTestHarness({ workers: [{ configPath }] });
  await harness.listen();
  return harness;
}
