import { connectorById } from "../catalog";
import type { ConnectorAdapter } from "../types";
import { fact, isoPeriod, parseJson, safeSegment } from "../util";

interface GleifQuery {
  lei?: string;
  legalName?: string;
  pageSize?: number;
}

export const gleifAdapter: ConnectorAdapter<GleifQuery> = {
  descriptor: connectorById("gleif"),
  buildRequest(query) {
    const url = new URL("https://api.gleif.org/api/v1/lei-records");
    if (query.lei) {
      if (!/^[A-Z0-9]{20}$/i.test(query.lei)) throw new TypeError("LEI must contain 20 alphanumeric characters.");
      url.pathname += `/${query.lei.toUpperCase()}`;
    }
    if (query.legalName) {
      if (query.legalName.length > 200) throw new RangeError("Legal-name query is too long.");
      url.searchParams.set("filter[entity.legalName]", query.legalName);
    }
    if (query.pageSize !== undefined) {
      if (!Number.isInteger(query.pageSize) || query.pageSize < 1 || query.pageSize > 200) {
        throw new RangeError("GLEIF pageSize must be 1-200.");
      }
      url.searchParams.set("page[size]", String(query.pageSize));
    }
    return { url: url.toString(), headers: { accept: "application/vnd.api+json" } };
  },
  normalize(payload, context) {
    const value = parseJson(payload) as { data?: unknown | unknown[] };
    const records = Array.isArray(value.data) ? value.data : value.data ? [value.data] : [];
    return records.map((raw) => {
      const record = raw as { id?: string; attributes?: Record<string, unknown> };
      const attributes = record.attributes ?? {};
      const entity = attributes.entity as Record<string, unknown> | undefined;
      const registration = attributes.registration as Record<string, unknown> | undefined;
      const legalName = entity?.legalName as Record<string, unknown> | undefined;
      const legalAddress = entity?.legalAddress as Record<string, unknown> | undefined;
      const lei = String(attributes.lei ?? record.id ?? "unknown");
      return fact(
        {
          id: `gleif:lei:${safeSegment(lei)}`,
          kind: "legal_entity_identity",
          validFrom: isoPeriod(registration?.initialRegistrationDate, context.retrievedAt),
          evidenceGrade: "THIRD_PARTY_VERIFIED",
          dimensions: { lei, jurisdiction: String(legalAddress?.country ?? "") },
          measures: {},
          attributes: {
            legalName: String(legalName?.name ?? ""),
            status: String(entity?.status ?? registration?.status ?? ""),
            lastUpdateDate: String(registration?.lastUpdateDate ?? ""),
            managingLou: String(registration?.managingLou ?? ""),
          },
        },
        context,
      );
    });
  },
};
