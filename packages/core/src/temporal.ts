import type { TemporalRecord } from "./types";

export function isIsoDateTime(value: string): boolean {
  if (typeof value !== "string" || value.length < 10) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && /T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
}

export function toEpoch(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new TypeError(`Invalid date-time: ${value}`);
  }
  return parsed;
}

export function isKnownAt(record: TemporalRecord, knownAt: string): boolean {
  const point = toEpoch(knownAt);
  if (toEpoch(record.observedAt) > point) return false;
  return record.supersededAt ? toEpoch(record.supersededAt) > point : true;
}

export function isValidAt(record: TemporalRecord, validAt: string): boolean {
  const point = toEpoch(validAt);
  if (toEpoch(record.validFrom) > point) return false;
  return record.validTo ? toEpoch(record.validTo) > point : true;
}

export function isVisibleAt(
  record: TemporalRecord,
  validAt: string,
  knownAt: string,
): boolean {
  return isKnownAt(record, knownAt) && isValidAt(record, validAt);
}
