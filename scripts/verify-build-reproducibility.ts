import { execFileSync } from "node:child_process";
import { treeDigest } from "./release-utils";

function buildOffline(): void {
  execFileSync("npm", ["run", "build:offline"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
}

buildOffline();
const first = await treeDigest(process.cwd(), ["dist"]);
buildOffline();
const second = await treeDigest(process.cwd(), ["dist"]);
if (first !== second) {
  throw new Error(
    `Production build is not byte reproducible: first=${first} second=${second}`,
  );
}
console.log(`Offline production build reproduced exactly: ${second}`);
