import { connectorById } from "../catalog";
import type { ConnectorAdapter } from "../types";
import { fact, isoPeriod, parseJson, stableFactId } from "../util";

interface OpenFdaQuery {
  search?: string;
  limit?: number;
  skip?: number;
}

export const openFdaAdapter: ConnectorAdapter<OpenFdaQuery> = {
  descriptor: connectorById("openfda-drug-shortages"),
  buildRequest(query, secrets = {}) {
    const url = new URL("https://api.fda.gov/drug/shortages.json");
    if (secrets.apiKey) url.searchParams.set("api_key", secrets.apiKey);
    if (query.search) {
      if (query.search.length > 1_000) throw new RangeError("openFDA search is too long.");
      url.searchParams.set("search", query.search);
    }
    const limit = query.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError("openFDA limit must be 1-100.");
    url.searchParams.set("limit", String(limit));
    if (query.skip !== undefined) {
      if (!Number.isInteger(query.skip) || query.skip < 0 || query.skip > 25_000) throw new RangeError("openFDA skip must be 0-25000.");
      url.searchParams.set("skip", String(query.skip));
    }
    return { url: url.toString() };
  },
  normalize(payload, context) {
    const value = parseJson(payload) as { results?: Array<Record<string, unknown>> };
    if (!Array.isArray(value.results)) throw new TypeError("openFDA payload needs a results array.");
    return value.results.map((row) => {
      const genericName = String(row.generic_name ?? row.genericName ?? "unknown");
      const company = String(row.company_name ?? row.companyName ?? row.manufacturer_name ?? "unknown");
      const postingDate = row.initial_posting_date ?? row.initialPostingDate;
      return fact(
        {
          id: stableFactId(
            "openfda-shortage",
            [genericName, company, postingDate],
            row,
          ),
          kind: "drug_shortage",
          validFrom: isoPeriod(postingDate, context.retrievedAt),
          evidenceGrade: "OFFICIAL_OBSERVED",
          dimensions: { genericName, company, status: String(row.status ?? "") },
          measures: {},
          attributes: {
            presentation: String(row.presentation ?? ""),
            therapeuticCategory: String(row.therapeutic_category ?? row.therapeuticCategory ?? ""),
            shortageReason: String(row.shortage_reason ?? row.shortageReason ?? ""),
            availability: String(row.availability ?? ""),
            updateDate: String(row.update_date ?? row.updateDate ?? ""),
          },
        },
        context,
      );
    });
  },
};
