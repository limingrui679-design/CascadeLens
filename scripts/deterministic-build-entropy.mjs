import crypto from "node:crypto";
import { syncBuiltinESMExports } from "node:module";

const seed = process.env.CASCADELENS_DETERMINISTIC_BUILD_SEED;
if (!seed) {
  throw new Error("Deterministic build entropy requires a source-identity seed.");
}

let counter = 0n;

function bytes(size) {
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new RangeError("Random byte size must be a non-negative safe integer.");
  }
  const output = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const block = crypto
      .createHash("sha256")
      .update(seed)
      .update("\0")
      .update(String(counter))
      .digest();
    counter += 1n;
    offset += block.copy(output, offset);
  }
  return output;
}

function deterministicRandomBytes(size, callback) {
  try {
    const output = bytes(size);
    if (typeof callback === "function") {
      queueMicrotask(() => callback(null, output));
      return;
    }
    return output;
  } catch (error) {
    if (typeof callback === "function") {
      queueMicrotask(() => callback(error));
      return;
    }
    throw error;
  }
}

function deterministicRandomUuid() {
  const value = bytes(16);
  value[6] = (value[6] & 0x0f) | 0x40;
  value[8] = (value[8] & 0x3f) | 0x80;
  const hex = value.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

crypto.randomBytes = deterministicRandomBytes;
crypto.randomUUID = deterministicRandomUuid;
syncBuiltinESMExports();
