import { unzipSync } from "fflate";

const safeArchivePath =
  /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/ (),+\u005b\u005d-]+$/;

interface XlsxBudgets {
  maxEntries: number;
  maxEntryBytes: number;
  maxTotalBytes: number;
  maxCompressionRatio: number;
}

const defaultBudgets: XlsxBudgets = {
  maxEntries: 100,
  maxEntryBytes: 10 * 1024 * 1024,
  maxTotalBytes: 50 * 1024 * 1024,
  maxCompressionRatio: 200,
};

export type XlsxCellValue = string | number | boolean | null;

function decodeXml(value: string): string {
  return value.replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|amp|apos|gt|lt|quot);/gi,
    (entity, decimal: string | undefined, hexadecimal: string | undefined) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hexadecimal) return String.fromCodePoint(Number.parseInt(hexadecimal, 16));
      const named: Record<string, string> = {
        "&amp;": "&",
        "&apos;": "'",
        "&gt;": ">",
        "&lt;": "<",
        "&quot;": '"',
      };
      return named[entity.toLowerCase()] ?? entity;
    },
  );
}

function attributes(tag: string): Record<string, string> {
  const output: Record<string, string> = {};
  for (const match of tag.matchAll(/([A-Za-z_][A-Za-z0-9_.:-]*)\s*=\s*"([^"]*)"/g)) {
    output[match[1]] = decodeXml(match[2]);
  }
  return output;
}

function decodeText(bytes: Uint8Array, label: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (error) {
    throw new TypeError(`${label} is not valid UTF-8 XML.`, { cause: error });
  }
}

function extractXlsxEntries(
  payload: Uint8Array,
  budgets: Partial<XlsxBudgets> = {},
): Record<string, Uint8Array> {
  if (
    payload.byteLength < 4 ||
    payload[0] !== 0x50 ||
    payload[1] !== 0x4b ||
    payload[2] !== 0x03 ||
    payload[3] !== 0x04
  ) {
    throw new TypeError("BEA input-output payload must be an XLSX archive.");
  }
  const limits = { ...defaultBudgets, ...budgets };
  const names = new Set<string>();
  let entries = 0;
  let totalBytes = 0;
  return unzipSync(payload, {
    filter(info) {
      entries += 1;
      if (entries > limits.maxEntries) throw new RangeError("XLSX entry budget exceeded.");
      if (!safeArchivePath.test(info.name)) throw new TypeError(`Unsafe XLSX path: ${info.name}`);
      if (names.has(info.name)) throw new TypeError(`Duplicate XLSX path: ${info.name}`);
      names.add(info.name);
      if (/\.(?:zip|tar|tgz|gz|7z|rar)$/i.test(info.name)) {
        throw new TypeError(`Nested archive is not allowed inside XLSX: ${info.name}`);
      }
      if (info.originalSize > limits.maxEntryBytes) {
        throw new RangeError(`XLSX entry exceeds byte budget: ${info.name}`);
      }
      totalBytes += info.originalSize;
      if (totalBytes > limits.maxTotalBytes) {
        throw new RangeError("XLSX total expansion budget exceeded.");
      }
      if (info.originalSize / Math.max(1, info.size) > limits.maxCompressionRatio) {
        throw new RangeError(`XLSX compression ratio exceeds budget: ${info.name}`);
      }
      return !info.name.endsWith("/");
    },
  });
}

function requiredEntry(entries: Record<string, Uint8Array>, path: string): Uint8Array {
  const entry = entries[path];
  if (!entry) throw new TypeError(`XLSX is missing required entry ${path}.`);
  return entry;
}

function sharedStrings(entries: Record<string, Uint8Array>): string[] {
  const entry = entries["xl/sharedStrings.xml"];
  if (!entry) return [];
  const xml = decodeText(entry, "XLSX shared strings");
  const output: string[] = [];
  for (const item of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const fragments = [...item[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(
      (match) => decodeXml(match[1]),
    );
    output.push(fragments.join(""));
  }
  return output;
}

function workbookSheets(entries: Record<string, Uint8Array>): Array<{ name: string; relationshipId: string }> {
  const workbook = decodeText(
    requiredEntry(entries, "xl/workbook.xml"),
    "XLSX workbook",
  );
  return [...workbook.matchAll(/<sheet\b[^>]*\/?\s*>/g)]
    .map((match) => attributes(match[0]))
    .map((item) => ({ name: item.name ?? "", relationshipId: item["r:id"] ?? "" }))
    .filter((item) => item.name && item.relationshipId);
}

function worksheetPath(entries: Record<string, Uint8Array>, sheetName: string): string {
  const relationshipId = workbookSheets(entries).find(
    (item) => item.name === sheetName,
  )?.relationshipId;
  if (!relationshipId) throw new TypeError(`XLSX sheet ${sheetName} was not found.`);

  const relationships = decodeText(
    requiredEntry(entries, "xl/_rels/workbook.xml.rels"),
    "XLSX workbook relationships",
  );
  const target = [...relationships.matchAll(/<Relationship\b[^>]*\/?\s*>/g)]
    .map((match) => attributes(match[0]))
    .find((item) => item.Id === relationshipId)?.Target;
  if (!target) throw new TypeError(`XLSX sheet ${sheetName} has no worksheet relationship.`);
  const normalized = target.replaceAll("\\", "/").replace(/^\/+/, "");
  const path = normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
  if (!safeArchivePath.test(path) || path.split("/").includes("..")) {
    throw new TypeError(`Unsafe XLSX worksheet path: ${target}`);
  }
  return path;
}

function inlineString(cellXml: string): string {
  return [...cellXml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

export function readXlsxSheet(
  payload: Uint8Array,
  sheetName: string,
): Map<string, XlsxCellValue> {
  if (!/^\d{4}$/.test(sheetName)) throw new TypeError("XLSX sheet name must be a four-digit year.");
  const entries = extractXlsxEntries(payload);
  const strings = sharedStrings(entries);
  const path = worksheetPath(entries, sheetName);
  const worksheet = decodeText(requiredEntry(entries, path), `XLSX worksheet ${sheetName}`);
  const output = new Map<string, XlsxCellValue>();
  for (const match of worksheet.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const cellAttributes = attributes(match[1]);
    const reference = cellAttributes.r?.toUpperCase();
    if (!reference || !/^[A-Z]{1,3}[1-9]\d{0,6}$/.test(reference)) {
      throw new TypeError("XLSX cell is missing a bounded A1 reference.");
    }
    if (output.has(reference)) throw new TypeError(`Duplicate XLSX cell ${reference}.`);
    const body = match[2];
    if (/<f\b/i.test(body)) {
      throw new TypeError(`Formula cells are not accepted in BEA source data: ${reference}`);
    }
    const rawValue = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
    let value: XlsxCellValue;
    switch (cellAttributes.t) {
      case "s": {
        const index = Number(rawValue);
        if (!Number.isInteger(index) || index < 0 || index >= strings.length) {
          throw new TypeError(`Invalid shared-string index at ${reference}.`);
        }
        value = strings[index];
        break;
      }
      case "inlineStr":
        value = inlineString(body);
        break;
      case "b":
        if (rawValue !== "0" && rawValue !== "1") {
          throw new TypeError(`Invalid Boolean XLSX value at ${reference}.`);
        }
        value = rawValue === "1";
        break;
      case "str":
        value = decodeXml(rawValue);
        break;
      case "e":
        throw new TypeError(`Error cell is not accepted in BEA source data: ${reference}`);
      default: {
        if (rawValue === "") value = null;
        else {
          const number = Number(rawValue);
          if (!Number.isFinite(number)) throw new TypeError(`Invalid numeric XLSX value at ${reference}.`);
          value = number;
        }
      }
    }
    output.set(reference, value);
  }
  return output;
}

export function listXlsxSheets(payload: Uint8Array): string[] {
  return workbookSheets(extractXlsxEntries(payload)).map((item) => item.name);
}
