import { connectorById } from "../catalog";
import type { ConnectorAdapter } from "../types";
import { fact, finite, isoPeriod, parseJson, safeSegment, stableFactId } from "../util";

interface SecQuery {
  cik: string;
  resource?: "companyfacts" | "submissions";
}

export const secEdgarAdapter: ConnectorAdapter<SecQuery> = {
  descriptor: connectorById("sec-edgar"),
  buildRequest(query) {
    if (!/^\d{1,10}$/.test(query.cik)) throw new TypeError("CIK must contain 1-10 digits.");
    const cik = query.cik.padStart(10, "0");
    const resource = query.resource ?? "companyfacts";
    const url =
      resource === "companyfacts"
        ? `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
        : `https://data.sec.gov/submissions/CIK${cik}.json`;
    return { url };
  },
  normalize(payload, context) {
    const value = parseJson(payload) as Record<string, unknown>;
    const cik = safeSegment(value.cik);
    const entity = String(value.entityName ?? value.name ?? "Unknown entity");
    const facts = value.facts as Record<string, Record<string, unknown>> | undefined;
    if (!facts) {
      const recent = (value.filings as { recent?: Record<string, unknown[]> } | undefined)?.recent;
      if (!recent) throw new TypeError("SEC payload is neither companyfacts nor submissions data.");
      const accessionNumbers = recent.accessionNumber ?? [];
      return accessionNumbers.map((accession, index) =>
        fact(
          {
            id: `sec-edgar:filing:${cik}:${safeSegment(accession)}`,
            kind: "entity_filing",
            validFrom: isoPeriod((recent.filingDate ?? [])[index], context.retrievedAt),
            evidenceGrade: "ENTITY_REPORTED",
            dimensions: {
              cik,
              accession: String(accession),
              form: String((recent.form ?? [])[index] ?? ""),
            },
            measures: {},
            attributes: {
              entity,
              filed: String((recent.filingDate ?? [])[index] ?? ""),
              reportDate: String((recent.reportDate ?? [])[index] ?? ""),
            },
          },
          context,
        ),
      );
    }
    const output = [];
    for (const [namespace, namespaceFacts] of Object.entries(facts)) {
      for (const [tag, rawDefinition] of Object.entries(namespaceFacts)) {
        const definition = rawDefinition as { label?: string; description?: string; units?: Record<string, Array<Record<string, unknown>>> };
        for (const [unit, records] of Object.entries(definition.units ?? {})) {
          for (const record of records) {
            output.push(
              fact(
                {
                  id: stableFactId(
                    "sec-edgar-fact",
                    [cik, namespace, tag, unit, record.accn],
                    record,
                  ),
                  kind: "xbrl_fact",
                  validFrom: isoPeriod(record.end ?? record.fy, context.retrievedAt),
                  evidenceGrade: "ENTITY_REPORTED",
                  dimensions: {
                    cik,
                    namespace,
                    tag,
                    unit,
                    accession: String(record.accn ?? ""),
                    form: String(record.form ?? ""),
                  },
                  measures: { value: finite(record.val) },
                  attributes: {
                    entity,
                    label: definition.label ?? "",
                    description: definition.description ?? "",
                    filed: String(record.filed ?? ""),
                    frame: String(record.frame ?? ""),
                  },
                },
                context,
              ),
            );
          }
        }
      }
    }
    return output;
  },
};
