import { connectorById } from "../catalog";
import { csvObjects } from "../csv";
import type { ConnectorAdapter } from "../types";
import { decode, fact, finite, isoPeriod, stableFactId } from "../util";

export const unctadLsciAdapter: ConnectorAdapter<{ file: string }> = {
  descriptor: connectorById("unctad-lsci"),
  buildRequest() {
    throw new Error("UNCTAD LSCI is import-only; provide a lawful user-downloaded export.");
  },
  normalize(payload, context) {
    const rows = csvObjects(decode(payload));
    return rows.map((row) => {
      const economy = row.Economy ?? row.Economy_label ?? row.Country ?? row.Port ?? "unknown";
      const period = row.Period ?? row.TIME_PERIOD ?? row.Date ?? "unknown";
      const measure = row.Measure ?? row.Indicator ?? "LSCI";
      return fact(
        {
          id: stableFactId("unctad-lsci", [economy, period, measure], row),
          kind: "shipping_connectivity_index",
          validFrom: isoPeriod(period, context.retrievedAt),
          evidenceGrade: "THIRD_PARTY_VERIFIED",
          dimensions: { economy: String(economy), period: String(period), measure: String(measure) },
          measures: { value: finite(row.Value ?? row.OBS_VALUE ?? row.Index) },
          attributes: { unit: row.Unit ?? "index", frequency: row.Frequency ?? "" },
        },
        context,
      );
    });
  },
};
