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
  input: Omit<NormalizedFact, "observedAt" | "sourceLocator">,
  context: NormalizeContext,
): NormalizedFact {
  return {
    ...input,
    observedAt: context.retrievedAt,
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
