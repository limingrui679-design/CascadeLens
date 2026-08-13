import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { treeDigest } from "./release-utils";

function buildOffline(): void {
  execFileSync("npm", ["run", "build:offline"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
}

const staleSentinel = resolve(process.cwd(), "dist/.cascadelens-stale-output-sentinel");
mkdirSync(resolve(process.cwd(), "dist"), { recursive: true });
writeFileSync(staleSentinel, "must be removed before the production build\n", "utf8");
buildOffline();
if (existsSync(staleSentinel)) {
  throw new Error("Production build retained a stale output from an earlier build.");
}
const first = await treeDigest(process.cwd(), ["dist"]);
buildOffline();
const second = await treeDigest(process.cwd(), ["dist"]);
if (first !== second) {
  throw new Error(
    `Production build is not byte reproducible: first=${first} second=${second}`,
  );
}
console.log(`Offline production build reproduced exactly: ${second}`);
