import { connectorById } from "../catalog";
import { csvObjects } from "../csv";
import type { ConnectorAdapter } from "../types";
import { decode, fact, finite, isoPeriod, stableFactId } from "../util";
import { extractSingleCsvFromZip } from "../zip";

interface FaostatQuery {
  fileUrl: string;
}

export const faostatAdapter: ConnectorAdapter<FaostatQuery> = {
  descriptor: connectorById("faostat"),
  buildRequest(query) {
    const url = new URL(query.fileUrl);
    if (!this.descriptor.allowedHosts.includes(url.hostname.toLowerCase())) {
      throw new TypeError("FAOSTAT fileUrl must use an approved official host.");
    }
    return { url: url.toString(), headers: { accept: "text/csv, application/zip" } };
  },
  normalize(payload, context) {
    const isZip =
      payload.byteLength >= 4 &&
      payload[0] === 0x50 &&
      payload[1] === 0x4b &&
      [0x03, 0x05, 0x07].includes(payload[2]) &&
      [0x04, 0x06, 0x08].includes(payload[3]);
    const csvPayload = isZip ? extractSingleCsvFromZip(payload) : payload;
    const rows = csvObjects(decode(csvPayload));
    return rows.map((row) => {
      const area = row["Area Code (M49)"] ?? row["Area Code"] ?? row.Area ?? "unknown";
      const item = row["Item Code"] ?? row.Item ?? "unknown";
      const element = row["Element Code"] ?? row.Element ?? "unknown";
      const year = row.Year ?? "unknown";
      return fact(
        {
          id: stableFactId("faostat", [area, item, element, year], row),
          kind: "food_agriculture_statistic",
          validFrom: isoPeriod(year, context.retrievedAt),
          evidenceGrade: "OFFICIAL_OBSERVED",
          dimensions: { area: String(area), item: String(item), element: String(element), year: String(year) },
          measures: { value: finite(row.Value) },
          attributes: { unit: row.Unit ?? "", flag: row.Flag ?? "", note: row.Note ?? "" },
        },
        context,
      );
    });
  },
};
