import { connectorById } from "../catalog";
import { csvObjects } from "../csv";
import type { ConnectorAdapter } from "../types";
import { decode, fact, finite, isoPeriod, stableFactId } from "../util";

export const imfPortwatchAdapter: ConnectorAdapter<{ file: string }> = {
  descriptor: connectorById("imf-portwatch"),
  buildRequest() {
    throw new Error("IMF PortWatch is import-only; provide a lawful user export.");
  },
  normalize(payload, context) {
    const rows = csvObjects(decode(payload));
    return rows.map((row) => {
      const portId = row.port_id ?? row.portid ?? row.PortCode ?? row.port ?? "unknown";
      const date = row.date ?? row.Date ?? row.TIME_PERIOD ?? "unknown";
      return fact(
        {
          id: stableFactId("imf-portwatch", [portId, date], row),
          kind: "port_activity_indicator",
          validFrom: isoPeriod(date, context.retrievedAt),
          evidenceGrade: "THIRD_PARTY_VERIFIED",
          dimensions: { portId: String(portId), portName: row.port_name ?? row.PortName ?? "", date: String(date) },
          measures: {
            imports: finite(row.imports ?? row.ImportValue),
            exports: finite(row.exports ?? row.ExportValue),
            disruption: finite(row.disruption ?? row.DisruptionIndex),
          },
          attributes: { country: row.country ?? row.Country ?? "", unit: row.unit ?? row.Unit ?? "" },
        },
        context,
      );
    });
  },
};
