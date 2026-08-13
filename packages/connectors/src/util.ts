import { stableStringify } from "../../core/src/canonical";
import type { NormalizeContext, NormalizedFact } from "./types";

export const decode = (payload: Uint8Array): string =>
  new TextDecoder("utf-8", { fatal: true }).decode(payload);

export function parseJson(payload: Uint8Array): unknown {
  const text = decode(payload);
  if (text.length > 100_000_000) throw new RangeError("JSON fixture exceeds normalization limit.");
  return JSON.parse(text) as unknown;
}

export function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function isoPeriod(value: unknown, fallback: string): string {
  const text = String(value ?? "");
  if (/^\d{4}$/.test(text)) return `${text}-01-01T00:00:00Z`;
  if (/^\d{6}$/.test(text)) return `${text.slice(0, 4)}-${text.slice(4)}-01T00:00:00Z`;
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01T00:00:00Z`;
  return fallback;
}

export function fact(
  input: Omit<
    NormalizedFact,
    "availableAt" | "observedAt" | "publishedAt" | "retrievedAt" | "sourceLocator"
  > &
    Partial<
      Pick<NormalizedFact, "availableAt" | "observedAt" | "publishedAt">
    >,
  context: NormalizeContext,
): NormalizedFact {
  return {
    ...input,
    observedAt:
      input.observedAt ?? context.availableAt ?? context.retrievedAt,
    publishedAt: input.publishedAt ?? context.publishedAt,
    availableAt: input.availableAt ?? context.availableAt ?? context.retrievedAt,
    retrievedAt: context.retrievedAt,
    sourceLocator: context.sourceLocator,
  };
}

export function safeSegment(value: unknown): string {
  return String(value ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function fnv1a64(value: string, seed: bigint): string {
  let hash = seed;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

/** Stable fact identity that is independent of upstream row order. */
export function stableFactId(
  namespace: string,
  businessKey: unknown[],
  record: unknown,
): string {
  const key = businessKey.map(safeSegment).join(":").slice(0, 60);
  const safeNamespace = safeSegment(namespace).slice(0, 32);
  const canonical = stableStringify(record);
  const digest =
    fnv1a64(canonical, 0xcbf29ce484222325n) +
    fnv1a64(canonical, 0x84222325cbf29ce4n);
  return `${safeNamespace}:${key}:${digest}`;
}

export function stabilizeNormalizedFacts(
  facts: NormalizedFact[],
): NormalizedFact[] {
  const sorted = [...facts].sort((left, right) => {
    const leftBytes = stableStringify(left);
    const rightBytes = stableStringify(right);
    return leftBytes < rightBytes ? -1 : leftBytes > rightBytes ? 1 : 0;
  });
  const totals = new Map<string, number>();
  for (const item of sorted) totals.set(item.id, (totals.get(item.id) ?? 0) + 1);
  const ordinal = new Map<string, number>();
  return sorted.map((item) => {
    if ((totals.get(item.id) ?? 0) === 1) return item;
    const next = (ordinal.get(item.id) ?? 0) + 1;
    ordinal.set(item.id, next);
    return { ...item, id: `${item.id}:duplicate-${next}` };
  });
}
