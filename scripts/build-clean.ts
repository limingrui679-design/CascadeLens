import { rmSync } from "node:fs";
import { resolve } from "node:path";

const buildOutputDirectories = ["dist", ".next", ".vinext"] as const;

export function cleanBuildOutputs(root: string): void {
  for (const directory of buildOutputDirectories) {
    rmSync(resolve(root, directory), { recursive: true, force: true });
  }
}
