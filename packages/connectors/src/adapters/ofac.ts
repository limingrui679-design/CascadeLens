import { connectorById } from "../catalog";
import { csvObjects } from "../csv";
import type { ConnectorAdapter } from "../types";
import { decode, fact, isoPeriod, safeSegment } from "../util";

interface OfacQuery {
  list?: "SDN" | "CONSOLIDATED";
  format?: "CSV" | "XML";
}

export const ofacAdapter: ConnectorAdapter<OfacQuery> = {
  descriptor: connectorById("ofac-sls"),
  buildRequest(query) {
    const list = query.list ?? "SDN";
    const format = query.format ?? "CSV";
    return {
      url: `https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/${list}.${format}`,
      headers: { accept: format === "CSV" ? "text/csv" : "application/xml" },
    };
  },
  normalize(payload, context) {
    const rows = csvObjects(decode(payload));
    return rows.map((row, index) => {
      const uid = row.Ent_num ?? row.UID ?? row.uid ?? String(index);
      const name = row.SDN_Name ?? row.Name ?? row.name ?? "unknown";
      return fact(
        {
          id: `ofac-sls:${safeSegment(uid)}`,
          kind: "sanctions_designation",
          validFrom: isoPeriod(row.Listed_On ?? row.Published ?? "", context.retrievedAt),
          evidenceGrade: "OFFICIAL_OBSERVED",
          dimensions: { uid: String(uid), name: String(name), type: row.SDN_Type ?? row.Type ?? "" },
          measures: {},
          attributes: {
            programs: row.Program ?? row.Programs ?? "",
            title: row.Title ?? "",
            remarks: row.Remarks ?? "",
            vesselFlag: row.Vess_flag ?? "",
          },
        },
        context,
      );
    });
  },
};
