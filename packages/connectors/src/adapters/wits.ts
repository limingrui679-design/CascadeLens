import { connectorById } from "../catalog";
import type { ConnectorAdapter } from "../types";
import { fact, finite, isoPeriod, parseJson, stableFactId } from "../util";

interface WitsQuery {
  datasource: "tradestats-trade" | "tradestats-tariff" | "tradestats-development" | "trn";
  reporter: string;
  partner: string;
  product: string;
  year: string;
  indicator: string;
}

function dimension(value: string): string {
  if (!/^[A-Za-z0-9;_-]{1,128}$/.test(value)) throw new TypeError("Invalid WITS dimension.");
  return value;
}

export const witsAdapter: ConnectorAdapter<WitsQuery> = {
  descriptor: connectorById("world-bank-wits"),
  buildRequest(query) {
    const url = new URL(
      `https://wits.worldbank.org/API/V1/SDMX/V21/datasource/${query.datasource}/reporter/${dimension(query.reporter)}/year/${dimension(query.year)}/partner/${dimension(query.partner)}/product/${dimension(query.product)}/indicator/${dimension(query.indicator)}`,
    );
    url.searchParams.set("format", "json");
    return { url: url.toString() };
  },
  normalize(payload, context) {
    const value = parseJson(payload) as Record<string, unknown>;
    const candidate = value.data ?? value.Data ?? value.TradeStats ?? value.WITS;
    const rows = Array.isArray(candidate)
      ? candidate
      : candidate && typeof candidate === "object"
        ? Object.values(candidate as Record<string, unknown>).flatMap((item) => Array.isArray(item) ? item : [])
        : [];
    if (rows.length === 0) throw new TypeError("WITS payload does not expose a supported data array.");
    return rows.map((raw) => {
      const row = raw as Record<string, unknown>;
      const reporter = row.reporter ?? row.Reporter ?? row.REPORTER;
      const partner = row.partner ?? row.Partner ?? row.PARTNER;
      const product = row.product ?? row.Product ?? row.PRODUCT;
      const year = row.year ?? row.Year ?? row.TIME_PERIOD;
      const indicator = row.indicator ?? row.Indicator ?? row.INDICATOR;
      return fact(
        {
          id: stableFactId(
            "wits",
            [reporter, partner, product, year, indicator],
            row,
          ),
          kind: "trade_tariff_indicator",
          validFrom: isoPeriod(year, context.retrievedAt),
          evidenceGrade: "OFFICIAL_OBSERVED",
          dimensions: {
            reporter: String(reporter ?? ""),
            partner: String(partner ?? ""),
            product: String(product ?? ""),
            year: String(year ?? ""),
            indicator: String(indicator ?? ""),
          },
          measures: { value: finite(row.value ?? row.Value ?? row.OBS_VALUE) },
          attributes: { unit: String(row.unit ?? row.Unit ?? "") },
        },
        context,
      );
    });
  },
};
