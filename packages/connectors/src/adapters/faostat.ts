import { connectorById } from "../catalog";
import { csvObjects } from "../csv";
import type { ConnectorAdapter } from "../types";
import { decode, fact, finite, isoPeriod, safeSegment } from "../util";

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
    const rows = csvObjects(decode(payload));
    return rows.map((row, index) => {
      const area = row["Area Code (M49)"] ?? row["Area Code"] ?? row.Area ?? "unknown";
      const item = row["Item Code"] ?? row.Item ?? "unknown";
      const element = row["Element Code"] ?? row.Element ?? "unknown";
      const year = row.Year ?? "unknown";
      return fact(
        {
          id: `faostat:${safeSegment(area)}:${safeSegment(item)}:${safeSegment(element)}:${safeSegment(year)}:${index}`,
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
