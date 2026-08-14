import {
  SCHEMA_VERSION,
  compareCanonicalStrings,
  sealSnapshot,
  stableStringify,
  type GraphSnapshot,
  type WorldEdge,
  type WorldNode,
} from "../../../core/src/index";
import { connectorById } from "../catalog";
import type {
  ConnectorAdapter,
  NormalizedConnectorSnapshot,
  NormalizedFact,
} from "../types";
import { fact, safeSegment } from "../util";
import { listXlsxSheets, readXlsxSheet, type XlsxCellValue } from "../xlsx";

interface BeaInputOutputQuery {
  table: "commodity-by-industry-direct-requirements-sector";
}

const sourceUrl =
  "https://apps.bea.gov/industry/release/xlsx/CxI_DR_Sector.xlsx";
const tableName =
  "Commodity-by-Industry Direct Requirements, After Redefinitions - Sector";

function columnName(index: number): string {
  let value = index;
  let output = "";
  while (value > 0) {
    value -= 1;
    output = String.fromCharCode(65 + (value % 26)) + output;
    value = Math.floor(value / 26);
  }
  return output;
}

function stringCell(cells: Map<string, XlsxCellValue>, reference: string): string {
  const value = cells.get(reference);
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`BEA workbook requires text in ${reference}.`);
  }
  return value.trim();
}

function numberCell(cells: Map<string, XlsxCellValue>, reference: string): number {
  const value = cells.get(reference);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`BEA workbook requires a finite coefficient in ${reference}.`);
  }
  if (value < 0 || value > 1) {
    throw new RangeError(`BEA direct-requirements coefficient in ${reference} must be 0-1.`);
  }
  return value;
}

function latestYear(payload: Uint8Array): string {
  const years = listXlsxSheets(payload)
    .filter((name) => /^\d{4}$/.test(name))
    .sort();
  const year = years.at(-1);
  if (!year) throw new TypeError("BEA workbook contains no four-digit year sheet.");
  return year;
}

function normalizeBeaWorkbook(
  payload: Uint8Array,
  context: Parameters<ConnectorAdapter["normalize"]>[1],
): NormalizedFact[] {
  const year = latestYear(payload);
  const cells = readXlsxSheet(payload, year);
  if (stringCell(cells, "A1") !== tableName) {
    throw new TypeError("BEA workbook title does not match the direct-requirements contract.");
  }
  if (String(cells.get("A4")) !== year) {
    throw new TypeError("BEA workbook year header does not match its latest sheet.");
  }

  const outputIndustries = Array.from({ length: 15 }, (_, offset) => {
    const column = columnName(offset + 3);
    return {
      column,
      code: stringCell(cells, `${column}6`),
      label: stringCell(cells, `${column}7`),
    };
  });
  if (new Set(outputIndustries.map((item) => item.code)).size !== outputIndustries.length) {
    throw new TypeError("BEA workbook contains duplicate output-industry codes.");
  }

  const facts: NormalizedFact[] = [];
  const inputCodes = new Set<string>();
  for (let row = 8; row < 200; row += 1) {
    const inputCode = cells.get(`A${row}`);
    if (inputCode === undefined || inputCode === null) break;
    if (typeof inputCode !== "string") {
      throw new TypeError(`BEA workbook requires a commodity code in A${row}.`);
    }
    if (!outputIndustries.some((item) => item.code === inputCode)) break;
    if (inputCodes.has(inputCode)) {
      throw new TypeError("BEA workbook contains duplicate input-commodity codes.");
    }
    inputCodes.add(inputCode);
    const inputLabel = stringCell(cells, `B${row}`);
    for (const output of outputIndustries) {
      const coefficient = numberCell(cells, `${output.column}${row}`);
      facts.push(
        fact(
          {
            id: `bea-input-output:direct-requirement:${year}:${safeSegment(inputCode)}:${safeSegment(output.code)}`,
            kind: "commodity_industry_direct_requirement",
            validFrom: `${year}-01-01T00:00:00Z`,
            evidenceGrade: "MODEL_INFERRED",
            dimensions: {
              inputCode,
              inputLabel,
              outputIndustryCode: output.code,
              outputIndustryLabel: output.label,
              year,
            },
            measures: { directRequirementCoefficient: coefficient },
            attributes: {
              coefficientUnit: "USD commodity input per USD industry output",
              priceBasis: "producers_prices",
              publisherStatus: "official_statistical_coefficient",
              table: tableName,
            },
          },
          context,
        ),
      );
    }
  }
  if (facts.length !== 225) {
    throw new TypeError(`BEA sector matrix must contain 225 coefficients; found ${facts.length}.`);
  }
  if (
    inputCodes.size !== outputIndustries.length ||
    outputIndustries.some((item) => !inputCodes.has(item.code))
  ) {
    throw new TypeError("BEA sector matrix input and output code sets must match exactly.");
  }
  return facts;
}

function yearOf(facts: NormalizedFact[]): string {
  const years = new Set(facts.map((item) => item.dimensions.year));
  if (years.size !== 1) throw new TypeError("BEA topology mapping requires exactly one year.");
  const year = [...years][0];
  if (!/^\d{4}$/.test(year)) throw new TypeError("BEA topology mapping requires a four-digit year.");
  return year;
}

async function mapBeaTopology(
  normalized: NormalizedConnectorSnapshot,
): Promise<GraphSnapshot> {
  if (normalized.connectorId !== "bea-input-output") {
    throw new TypeError("BEA topology mapper received a different connector snapshot.");
  }
  const facts = normalized.facts.filter(
    (item) => item.kind === "commodity_industry_direct_requirement",
  );
  if (facts.length !== 225 || facts.length !== normalized.facts.length) {
    throw new TypeError("BEA topology mapper requires one complete 15x15 sector matrix.");
  }
  const year = yearOf(facts);
  const sourceId = `connector-source:bea-input-output:${normalized.contentDigest.slice(0, 16)}`;
  const commodityLabels = new Map<string, string>();
  const industryLabels = new Map<string, string>();
  for (const item of facts) {
    commodityLabels.set(item.dimensions.inputCode, item.dimensions.inputLabel);
    industryLabels.set(
      item.dimensions.outputIndustryCode,
      item.dimensions.outputIndustryLabel,
    );
  }
  if (commodityLabels.size !== 15 || industryLabels.size !== 15) {
    throw new TypeError("BEA topology mapper requires 15 commodities and 15 industries.");
  }
  const observedAt = normalized.retrievedAt;
  const evidence = {
    grade: "MODEL_INFERRED" as const,
    confidence: 0.85,
    sourceIds: [sourceId],
    reviewStatus: "not_required" as const,
  };
  const nodes: WorldNode[] = [
    ...[...commodityLabels].map(([code, label]) => ({
      id: `bea:commodity:${safeSegment(code)}`,
      kind: "product" as const,
      label: `${label} commodity input`,
      description: "BEA sector-level commodity used as an input in the direct-requirements matrix.",
      validFrom: `${year}-01-01T00:00:00Z`,
      observedAt,
      properties: {
        beaCode: code,
        bufferShare: 0,
        criticality: 1,
        factualStatus: "official_published_statistical_category",
        year,
      },
      evidence,
    })),
    ...[...industryLabels].map(([code, label]) => ({
      id: `bea:industry:${safeSegment(code)}`,
      kind: "industry" as const,
      label,
      description: "BEA sector-level consuming industry in the direct-requirements matrix.",
      validFrom: `${year}-01-01T00:00:00Z`,
      observedAt,
      properties: {
        beaCode: code,
        bufferShare: 0,
        criticality: 1,
        factualStatus: "official_published_statistical_category",
        year,
      },
      evidence,
    })),
  ].sort((left, right) => compareCanonicalStrings(left.id, right.id));

  const edges: WorldEdge[] = facts
    .filter((item) => (item.measures.directRequirementCoefficient ?? 0) > 0)
    .map((item) => ({
      id: `bea:input-edge:${year}:${safeSegment(item.dimensions.inputCode)}:${safeSegment(item.dimensions.outputIndustryCode)}`,
      from: `bea:commodity:${safeSegment(item.dimensions.inputCode)}`,
      to: `bea:industry:${safeSegment(item.dimensions.outputIndustryCode)}`,
      relation: "inputs_to" as const,
      weight: {
        value: item.measures.directRequirementCoefficient!,
        unit: "share",
      },
      validFrom: item.validFrom,
      observedAt: item.observedAt,
      properties: {
        coefficientUnit: item.attributes.coefficientUnit,
        eligibleForPrimaryEstimate: false,
        factualStatus: "official_published_derived_coefficient",
        inputCode: item.dimensions.inputCode,
        outputIndustryCode: item.dimensions.outputIndustryCode,
        publisherMethod: tableName,
        year,
      },
      evidence,
    }))
    .sort((left, right) => compareCanonicalStrings(left.id, right.id));
  if (edges.length === 0 || edges.length > 225) {
    throw new TypeError(`BEA sector graph must contain 1-225 positive edges; found ${edges.length}.`);
  }

  const bytes = new TextEncoder().encode(stableStringify(normalized)).byteLength;
  return sealSnapshot({
    schemaVersion: SCHEMA_VERSION,
    snapshotId: `connector-snapshot:bea-input-output:${normalized.contentDigest.slice(0, 16)}`,
    title: `${year} BEA sector direct-requirements graph`,
    decisionCutoff: normalized.retrievedAt,
    generatedAt: normalized.retrievedAt,
    sources: [
      {
        id: sourceId,
        title: `${year} BEA commodity-by-industry direct requirements, sector level`,
        publisher: "U.S. Bureau of Economic Analysis",
        uri: normalized.sourceLocator,
        retrievedAt: normalized.retrievedAt,
        availableAt: normalized.retrievedAt,
        sha256: normalized.contentDigest,
        contentType: "application/json",
        artifactKind: "normalized_snapshot",
        digestScope: "canonical_record",
        bytes,
        role: "input",
        license: {
          mode: "redistributable",
          name: "U.S. Government Public Domain",
          termsUri: "https://www.bea.gov/help/faq/145",
          spdx: "LicenseRef-Public-Domain-USGov",
          notes:
            "Source: U.S. Bureau of Economic Analysis. No BEA endorsement is implied.",
        },
      },
    ],
    nodes,
    edges,
  });
}

export const beaInputOutputAdapter: ConnectorAdapter<BeaInputOutputQuery> = {
  descriptor: connectorById("bea-input-output"),
  buildRequest(query) {
    if (query.table !== "commodity-by-industry-direct-requirements-sector") {
      throw new TypeError("BEA connector supports only the bounded sector direct-requirements table.");
    }
    return {
      url: sourceUrl,
      headers: {
        accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    };
  },
  normalize: normalizeBeaWorkbook,
  mapToWorldGraph: mapBeaTopology,
};
