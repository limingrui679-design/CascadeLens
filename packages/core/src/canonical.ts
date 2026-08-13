import type { JsonValue } from "./types";

const encoder = new TextEncoder();

/**
 * Locale-independent ordering for every value that can affect a content digest.
 * UTF-8 byte order is explicit, deterministic, and does not consult the host's
 * locale or ICU configuration.
 */
export function compareCanonicalStrings(left: string, right: string): number {
  if (left === right) return 0;
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  const length = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    if (leftBytes[index] !== rightBytes[index]) {
      return leftBytes[index] - rightBytes[index];
    }
  }
  return leftBytes.length - rightBytes.length;
}

function normalize(value: unknown, path: string): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number at ${path}`);
    }
    return Object.is(value, -0) ? 0 : value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => normalize(item, `${path}[${index}]`));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => compareCanonicalStrings(left, right));
    const normalized: Record<string, JsonValue> = {};
    for (const [key, item] of entries) {
      normalized[key] = normalize(item, `${path}.${key}`);
    }
    return normalized;
  }

  throw new TypeError(`Unsupported canonical value at ${path}: ${typeof value}`);
}

export function canonicalize(value: unknown): JsonValue {
  return normalize(value, "$");
}

export function stableStringify(value: unknown, space = 0): string {
  return JSON.stringify(canonicalize(value), null, space);
}

export async function sha256Text(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function digestCanonical(value: unknown): Promise<string> {
  return sha256Text(stableStringify(value));
}
