import type {
  EvidenceGrade,
  GraphSnapshot,
  JsonValue,
  RedistributionMode,
} from "../../core/src/types";

export const connectorIds = [
  "un-comtrade",
  "oecd-icio",
  "sec-edgar",
  "gleif",
  "faostat",
  "openfda-drug-shortages",
  "ofac-sls",
  "world-bank-wits",
  "unctad-lsci",
  "imf-portwatch",
  "bea-input-output",
] as const;

export type ConnectorId = (typeof connectorIds)[number];
export type ConnectorAuth = "none" | "optional_api_key" | "required_api_key" | "user_file";
export type ConnectorRuntime = "remote" | "import_only";

export interface ConnectorDescriptor {
  id: ConnectorId;
  name: string;
  publisher: string;
  officialUri: string;
  documentationUri: string;
  termsUri: string;
  checkedAt: string;
  runtime: ConnectorRuntime;
  redistributionMode: RedistributionMode;
  rawRedistributable: boolean;
  evidenceGrade: EvidenceGrade;
  auth: ConnectorAuth;
  allowedHosts: string[];
  minimumIntervalMs: number;
  maxResponseBytes: number;
  boundary: string;
  redistributionLicense?: {
    name: string;
    spdx?: string;
  };
  licenseNotes: string[];
  operationalNotes: string[];
}

export interface ConnectorRequest {
  url: string;
  headers?: Record<string, string>;
}

export interface ConnectorSnapshot {
  connectorId: ConnectorId;
  requestUri: string;
  retrievedAt: string;
  contentType: string;
  sha256: string;
  bytes: number;
  payload: Uint8Array;
}

export interface NormalizedFact {
  id: string;
  kind: string;
  validFrom: string;
  validTo?: string;
  publishedAt?: string;
  availableAt: string;
  retrievedAt: string;
  observedAt: string;
  sourceLocator: string;
  evidenceGrade: EvidenceGrade;
  dimensions: Record<string, string>;
  measures: Record<string, number | null>;
  attributes: Record<string, JsonValue>;
}

export interface NormalizeContext {
  retrievedAt: string;
  sourceLocator: string;
  publishedAt?: string;
  availableAt?: string;
}

export interface NormalizedConnectorSnapshot {
  schemaVersion: "cascadelens-normalized-snapshot/1.0";
  connectorId: string;
  retrievedAt: string;
  sourceLocator: string;
  sourceManifestDigest: string;
  facts: NormalizedFact[];
  contentDigest: string;
}

export interface ConnectorAdapter<Query = Record<string, string>> {
  descriptor: ConnectorDescriptor;
  buildRequest(query: Query, secrets?: Record<string, string>): ConnectorRequest;
  normalize(payload: Uint8Array, context: NormalizeContext): NormalizedFact[];
  /**
   * Optional evidence-preserving domain map. Connectors without one retain the
   * conservative metric-node mapping and create no relationship edges.
   */
  mapToWorldGraph?(snapshot: NormalizedConnectorSnapshot): Promise<GraphSnapshot>;
}

export interface FetchPolicy {
  timeoutMs?: number;
  retries?: number;
  userAgent: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}
