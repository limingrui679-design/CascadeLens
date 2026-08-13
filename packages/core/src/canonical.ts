import type { JsonValue } from "./types";

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
      .sort(([left], [right]) => left.localeCompare(right));
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
