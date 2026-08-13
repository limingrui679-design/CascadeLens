import { connectorById } from "../catalog";
import { csvObjects } from "../csv";
import type { ConnectorAdapter } from "../types";
import { decode, fact, finite, isoPeriod, safeSegment } from "../util";

interface OecdQuery {
  agency: string;
  dataset: string;
  version?: string;
  selection?: string;
  startPeriod?: string;
  endPeriod?: string;
  space?: "public" | "sti-public";
}

function identifier(value: string, label: string): string {
  if (!/^[A-Za-z0-9_.@+-]{1,128}$/.test(value)) throw new TypeError(`Invalid OECD ${label}.`);
  return value;
}

export const oecdIcioAdapter: ConnectorAdapter<OecdQuery> = {
  descriptor: connectorById("oecd-icio"),
  buildRequest(query) {
    const space = query.space ?? "public";
    const agency = identifier(query.agency, "agency");
    const dataset = identifier(query.dataset, "dataset");
    const version = query.version ? `,${identifier(query.version, "version")}` : "";
    const selection = query.selection ? identifier(query.selection, "selection") : "all";
    const url = new URL(
      `https://sdmx.oecd.org/${space}/rest/data/${agency},${dataset}${version}/${selection}`,
    );
    url.searchParams.set("dimensionAtObservation", "AllDimensions");
    url.searchParams.set("format", "csvfile");
    if (query.startPeriod) url.searchParams.set("startPeriod", identifier(query.startPeriod, "startPeriod"));
    if (query.endPeriod) url.searchParams.set("endPeriod", identifier(query.endPeriod, "endPeriod"));
    return { url: url.toString(), headers: { accept: "text/csv" } };
  },
  normalize(payload, context) {
    const rows = csvObjects(decode(payload));
    return rows.map((row, index) => {
      const period = row.TIME_PERIOD ?? row.Time ?? row.time ?? "unknown";
      const area = row.REF_AREA ?? row.LOCATION ?? row.Country ?? "unknown";
      const activity = row.ACTIVITY ?? row.INDUSTRY ?? row.SUBJECT ?? "unknown";
      const counterpart = row.COUNTERPART_AREA ?? row.PARTNER ?? row.Counterpart ?? "not_applicable";
      return fact(
        {
          id: `oecd-icio:${safeSegment(period)}:${safeSegment(area)}:${safeSegment(activity)}:${safeSegment(counterpart)}:${index}`,
          kind: "country_industry_account",
          validFrom: isoPeriod(period, context.retrievedAt),
          evidenceGrade: "OFFICIAL_OBSERVED",
          dimensions: {
            area: String(area),
            activity: String(activity),
            counterpart: String(counterpart),
            period: String(period),
          },
          measures: { value: finite(row.OBS_VALUE ?? row.Value ?? row.value) },
          attributes: {
            unit: row.UNIT_MEASURE ?? row.Unit ?? "",
            measure: row.MEASURE ?? row.INDICATOR ?? "",
          },
        },
        context,
      );
    });
  },
};
