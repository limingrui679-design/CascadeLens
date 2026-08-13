import { connectorById } from "../catalog";
import type { ConnectorAdapter } from "../types";
import { fact, finite, isoPeriod, parseJson, safeSegment, stableFactId } from "../util";

interface ComtradeQuery {
  type?: "C" | "S";
  frequency?: "A" | "M";
  classification?: string;
  reporterCode: string;
  partnerCode?: string;
  period: string;
  flowCode?: string;
  cmdCode?: string;
  maxRecords?: number;
}

function code(value: string, label: string): string {
  if (!/^[A-Za-z0-9_,+-]{1,100}$/.test(value)) throw new TypeError(`Invalid ${label}.`);
  return value;
}

export const unComtradeAdapter: ConnectorAdapter<ComtradeQuery> = {
  descriptor: connectorById("un-comtrade"),
  buildRequest(query, secrets = {}) {
    const apiKey = secrets.subscriptionKey;
    const type = query.type ?? "C";
    const frequency = query.frequency ?? "A";
    const classification = code(query.classification ?? "HS", "classification");
    const path = apiKey ? "data/v1/get" : "public/v1/preview";
    const url = new URL(
      `https://comtradeapi.un.org/${path}/${type}/${frequency}/${classification}`,
    );
    url.searchParams.set("reporterCode", code(query.reporterCode, "reporterCode"));
    url.searchParams.set("period", code(query.period, "period"));
    if (query.partnerCode) url.searchParams.set("partnerCode", code(query.partnerCode, "partnerCode"));
    if (query.flowCode) url.searchParams.set("flowCode", code(query.flowCode, "flowCode"));
    if (query.cmdCode) url.searchParams.set("cmdCode", code(query.cmdCode, "cmdCode"));
    if (query.maxRecords !== undefined) {
      if (!Number.isInteger(query.maxRecords) || query.maxRecords < 1 || query.maxRecords > 100_000) {
        throw new RangeError("maxRecords must be an integer from 1 to 100000.");
      }
      url.searchParams.set("maxRecords", String(query.maxRecords));
    }
    if (apiKey) url.searchParams.set("subscription-key", apiKey);
    return { url: url.toString() };
  },
  normalize(payload, context) {
    const value = parseJson(payload) as { data?: Array<Record<string, unknown>> };
    if (!Array.isArray(value.data)) throw new TypeError("UN Comtrade payload needs a data array.");
    return value.data.map((row) => {
      const reporter = safeSegment(row.reporterCode ?? row.reporterISO);
      const partner = safeSegment(row.partnerCode ?? row.partnerISO);
      const commodity = safeSegment(row.cmdCode);
      const flow = safeSegment(row.flowCode);
      const period = safeSegment(row.period);
      return fact(
        {
          id: stableFactId(
            "un-comtrade",
            [period, reporter, partner, commodity, flow],
            row,
          ),
          kind: "bilateral_trade",
          validFrom: isoPeriod(row.period, context.retrievedAt),
          evidenceGrade: "OFFICIAL_OBSERVED",
          dimensions: { reporter, partner, commodity, flow, period },
          measures: {
            primaryValue: finite(row.primaryValue),
            netWeight: finite(row.netWgt),
            quantity: finite(row.qty),
          },
          attributes: {
            isAggregate: Boolean(row.isAggregate),
            classification: String(row.clCode ?? ""),
          },
        },
        context,
      );
    });
  },
};
