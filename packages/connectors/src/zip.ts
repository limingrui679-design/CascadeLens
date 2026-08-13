import { unzipSync } from "fflate";

const safeArchivePath = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/ (),+-]+$/;

export interface ZipBudgets {
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
  maxCompressionRatio: number;
}

const defaultBudgets: ZipBudgets = {
  maxEntries: 100,
  maxEntryBytes: 50 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  maxCompressionRatio: 100,
};

export function extractSingleCsvFromZip(
  payload: Uint8Array,
  budgets: Partial<ZipBudgets> = {},
): Uint8Array {
  const limits = { ...defaultBudgets, ...budgets };
  let entries = 0;
  let totalBytes = 0;
  const csvNames: string[] = [];
  const names = new Set<string>();
  const output = unzipSync(payload, {
    filter(info) {
      entries += 1;
      if (entries > limits.maxEntries) throw new RangeError("ZIP entry budget exceeded.");
      if (!safeArchivePath.test(info.name)) throw new TypeError(`Unsafe ZIP path: ${info.name}`);
      if (names.has(info.name)) throw new TypeError(`Duplicate ZIP path: ${info.name}`);
      names.add(info.name);
      if (/\.(?:zip|tar|tgz|gz|7z|rar)$/i.test(info.name)) {
        throw new TypeError(`Nested archive is not allowed: ${info.name}`);
      }
      if (info.originalSize > limits.maxEntryBytes) {
        throw new RangeError(`ZIP entry exceeds byte budget: ${info.name}`);
      }
      totalBytes += info.originalSize;
      if (totalBytes > limits.maxTotalBytes) {
        throw new RangeError("ZIP total expansion budget exceeded.");
      }
      const ratio = info.originalSize / Math.max(1, info.size);
      if (ratio > limits.maxCompressionRatio) {
        throw new RangeError(`ZIP compression ratio exceeds budget: ${info.name}`);
      }
      if (info.name.endsWith("/")) return false;
      if (!/\.csv$/i.test(info.name)) return false;
      csvNames.push(info.name);
      return true;
    },
  });
  const normalizedCandidates = csvNames.filter((name) =>
    /_All_Data_\(Normalized\)\.csv$/i.test(name),
  );
  const csvName = normalizedCandidates.length === 1
    ? normalizedCandidates[0]
    : normalizedCandidates.length === 0 && csvNames.length === 1
      ? csvNames[0]
      : undefined;
  if (!csvName || !output[csvName]) {
    throw new TypeError("ZIP must contain exactly one unambiguous data CSV file.");
  }
  return output[csvName];
}
