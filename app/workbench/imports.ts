import { csvObjects } from "../../packages/connectors/src/csv";
import {
  SCHEMA_VERSION,
  parseShockScript,
  sealSnapshot,
  sha256Text,
  verifySnapshot,
  type GraphSnapshot,
  type GraphSnapshotDraft,
  type ShockScenario,
  type WorldEdge,
  type WorldNode,
} from "../../packages/core/src/index";

const maximumGraphBytes = 5_000_000;
const maximumNodes = 10_000;
const maximumEdges = 50_000;

function slug(value: string): string {
  const output = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-._]+|[-._]+$/g, "")
    .slice(0, 80);
  return output || "item";
}

function unitInterval(value: unknown, fallback: number, path: string): number {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new RangeError(`${path} must be a finite number between 0 and 1.`);
  }
  return parsed;
}

interface RawNode {
  id: string;
  label?: string;
  kind?: string;
  [key: string]: unknown;
}

interface RawEdge {
  source: string;
  target: string;
  relation?: string;
  weight?: unknown;
  lower?: unknown;
  upper?: unknown;
  [key: string]: unknown;
}

async function normalizedSnapshot(
  text: string,
  title: string,
  rawNodes: RawNode[],
  rawEdges: RawEdge[],
  contentType: string,
): Promise<GraphSnapshot> {
  if (rawNodes.length === 0 || rawNodes.length > maximumNodes) {
    throw new RangeError(`Use 1-${maximumNodes.toLocaleString()} nodes.`);
  }
  if (rawEdges.length > maximumEdges) {
    throw new RangeError(`Use at most ${maximumEdges.toLocaleString()} edges.`);
  }
  const cutoff = new Date().toISOString();
  const sourceId = "source:user-provided:graph";
  const idByRaw = new Map<string, string>();
  const used = new Set<string>();
  const nodes: WorldNode[] = rawNodes.map((item) => {
    if (idByRaw.has(item.id)) {
      throw new TypeError(`Duplicate node id: ${item.id}`);
    }
    let id = `node:user:${slug(item.id)}`;
    let suffix = 2;
    while (used.has(id)) {
      id = `node:user:${slug(item.id)}-${suffix}`;
      suffix += 1;
    }
    used.add(id);
    idByRaw.set(item.id, id);
    const kind = [
      "country", "region", "product", "industry", "legal_entity", "facility",
      "port", "route", "security", "fund", "medicine", "policy", "event", "metric",
    ].includes(String(item.kind)) ? item.kind as WorldNode["kind"] : "metric";
    return {
      id,
      kind,
      label: String(item.label ?? item.id),
      description: "Imported user-provided node; not independently verified by CascadeLens.",
      validFrom: cutoff,
      observedAt: cutoff,
      properties: {
        bufferShare: unitInterval(
          item.bufferShare ?? item.buffer_share,
          0,
          `Node ${item.id} bufferShare`,
        ),
        criticality: unitInterval(item.criticality, 1, `Node ${item.id} criticality`),
        factualStatus: "user_provided_unverified",
      },
      evidence: {
        grade: "MODEL_INFERRED",
        confidence: 0.25,
        sourceIds: [sourceId],
        reviewStatus: "not_required",
      },
    };
  });
  const edges: WorldEdge[] = rawEdges.map((item, index) => {
    const from = idByRaw.get(item.source);
    const to = idByRaw.get(item.target);
    if (!from || !to) throw new TypeError(`Edge ${index + 1} references an unknown node.`);
    const value = unitInterval(item.weight, 0.5, `Edge ${index + 1} weight`);
    const lower = unitInterval(item.lower, value, `Edge ${index + 1} lower`);
    const upper = unitInterval(item.upper, value, `Edge ${index + 1} upper`);
    if (lower > value || value > upper) {
      throw new RangeError(`Edge ${index + 1} requires lower <= weight <= upper.`);
    }
    const relations = [
      "trades_to", "supplies", "inputs_to", "depends_on", "owns", "holds",
      "located_in", "connects_to", "substitute_for", "regulated_by", "exposed_to",
      "disclosed_relation",
    ];
    return {
      id: `edge:user:${String(index + 1).padStart(6, "0")}`,
      from,
      to,
      relation: relations.includes(String(item.relation))
        ? item.relation as WorldEdge["relation"]
        : "depends_on",
      weight: { value, lower, upper, unit: "share" },
      validFrom: cutoff,
      observedAt: cutoff,
      properties: {
        eligibleForPrimaryEstimate: false,
        factualStatus: "user_provided_unverified",
      },
      evidence: {
        grade: "MODEL_INFERRED",
        confidence: 0.25,
        sourceIds: [sourceId],
        reviewStatus: "not_required",
      },
    };
  });
  const draft: GraphSnapshotDraft = {
    schemaVersion: SCHEMA_VERSION,
    snapshotId: `snapshot:user:${(await sha256Text(text)).slice(0, 20)}`,
    title,
    decisionCutoff: cutoff,
    generatedAt: cutoff,
    nodes,
    edges,
    sources: [{
      id: sourceId,
      title,
      publisher: "User provided",
      uri: "https://github.com/limingrui679-design/CascadeLens/blob/main/docs/tutorials/02_bring_your_own_graph.md",
      retrievedAt: cutoff,
      availableAt: cutoff,
      publishedAt: cutoff,
      sha256: await sha256Text(text),
      contentType,
      artifactKind: "raw_snapshot",
      digestScope: "exact_bytes",
      bytes: new TextEncoder().encode(text).byteLength,
      role: "input",
      license: {
        mode: "user_provided",
        name: "User-provided data; user controls terms",
        termsUri: "https://github.com/limingrui679-design/CascadeLens/blob/main/docs/DATA_LICENSES.md",
        notes: "CascadeLens does not infer redistribution rights for imported data.",
      },
    }],
  };
  return sealSnapshot(draft);
}

function simpleJson(value: unknown): { nodes: RawNode[]; edges: RawEdge[]; title: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("JSON graph must be an object.");
  }
  const document = value as Record<string, unknown>;
  if (!Array.isArray(document.nodes) || !Array.isArray(document.edges)) {
    throw new TypeError("Simple JSON needs nodes and edges arrays.");
  }
  const nodes = document.nodes.map((item, index): RawNode => {
    if (typeof item === "string") return { id: item, label: item };
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new TypeError(`nodes[${index}] must be a string or object.`);
    }
    const record = item as Record<string, unknown>;
    const id = record.id ?? record.name;
    if (typeof id !== "string" || id.trim() === "") {
      throw new TypeError(`nodes[${index}] needs id or name.`);
    }
    return { ...record, id } as RawNode;
  });
  const edges = document.edges.map((item, index): RawEdge => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new TypeError(`edges[${index}] must be an object.`);
    }
    const record = item as Record<string, unknown>;
    const source = record.source ?? record.from;
    const target = record.target ?? record.to;
    if (typeof source !== "string" || typeof target !== "string") {
      throw new TypeError(`edges[${index}] needs source/from and target/to.`);
    }
    return { ...record, source, target } as RawEdge;
  });
  return { nodes, edges, title: String(document.title ?? "Imported JSON graph") };
}

function graphMl(text: string): { nodes: RawNode[]; edges: RawEdge[] } {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) {
    throw new TypeError("GraphML document type and entity declarations are not supported.");
  }
  const document = new DOMParser().parseFromString(text, "application/xml");
  const error = document.querySelector("parsererror");
  if (error) throw new SyntaxError("GraphML could not be parsed.");
  const keyNames = new Map<string, string>();
  document.querySelectorAll("key").forEach((key) => {
    const id = key.getAttribute("id");
    if (id) keyNames.set(id, key.getAttribute("attr.name") ?? id);
  });
  const data = (element: Element) => {
    const output: Record<string, string> = {};
    Array.from(element.children).filter((child) => child.localName === "data").forEach((child) => {
      const key = child.getAttribute("key") ?? "value";
      output[keyNames.get(key) ?? key] = child.textContent?.trim() ?? "";
    });
    return output;
  };
  const nodes = Array.from(document.getElementsByTagNameNS("*", "node")).map((node) => {
    const id = node.getAttribute("id");
    if (!id) throw new TypeError("GraphML node is missing id.");
    const attrs = data(node);
    return { id, label: attrs.label ?? attrs.name ?? id, ...attrs };
  });
  const graph = document.getElementsByTagNameNS("*", "graph").item(0);
  if (!graph) throw new TypeError("GraphML document contains no graph element.");
  const undirected = graph.getAttribute("edgedefault") === "undirected";
  const edges = Array.from(document.getElementsByTagNameNS("*", "edge")).flatMap((edge) => {
    const source = edge.getAttribute("source");
    const target = edge.getAttribute("target");
    if (!source || !target) throw new TypeError("GraphML edge is missing source or target.");
    const attributes = data(edge);
    const directed = edge.getAttribute("directed");
    const expand = directed === "false" || (directed !== "true" && undirected);
    return expand
      ? [{ source, target, ...attributes }, { source: target, target: source, ...attributes }]
      : [{ source, target, ...attributes }];
  });
  return { nodes, edges };
}

export async function importGraphFile(file: File): Promise<GraphSnapshot> {
  if (file.size > maximumGraphBytes) throw new RangeError("Graph file exceeds the 5 MB browser limit.");
  const text = await file.text();
  const suffix = file.name.toLowerCase().split(".").at(-1);
  if (suffix === "json") {
    const value = JSON.parse(text) as unknown;
    if (value && typeof value === "object" && !Array.isArray(value) && "contentDigest" in value) {
      const snapshot = value as GraphSnapshot;
      const issues = await verifySnapshot(snapshot);
      if (issues.some((issue) => issue.severity === "error")) {
        throw new TypeError(`Invalid WorldGraph: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`);
      }
      return snapshot;
    }
    const graph = simpleJson(value);
    return normalizedSnapshot(text, graph.title, graph.nodes, graph.edges, file.type || "application/json");
  }
  if (suffix === "csv") {
    const rows = csvObjects(text);
    const nodeById = new Map<string, RawNode>();
    const edges = rows.map((row, index): RawEdge => {
      const source = row.source ?? row.from;
      const target = row.target ?? row.to;
      if (!source || !target) throw new TypeError(`CSV row ${index + 2} needs source/target or from/to.`);
      nodeById.set(source, { id: source, label: row.source_label || source });
      nodeById.set(target, { id: target, label: row.target_label || target });
      return { ...row, source, target };
    });
    return normalizedSnapshot(text, "Imported CSV dependency graph", [...nodeById.values()], edges, file.type || "text/csv");
  }
  if (suffix === "graphml" || suffix === "xml") {
    const graph = graphMl(text);
    return normalizedSnapshot(text, "Imported GraphML dependency graph", graph.nodes, graph.edges, file.type || "application/graphml+xml");
  }
  throw new TypeError("Choose a .json, .csv, or .graphml graph file.");
}

export async function importScenarioFile(file: File): Promise<ShockScenario> {
  if (file.size > 1_000_000) throw new RangeError("ShockScript exceeds the 1 MB limit.");
  return parseShockScript(await file.text());
}

export function starterScenario(snapshot: GraphSnapshot): ShockScenario {
  const first = snapshot.nodes[0];
  const start = new Date(new Date(snapshot.decisionCutoff).getTime() + 86_400_000).toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    scenarioId: "user-graph-stress",
    title: "User-provided graph stress",
    summary: "A scenario-only starter generated from a user-provided graph.",
    classification: "synthetic_stress",
    decisionCutoff: snapshot.decisionCutoff,
    graphSnapshotId: snapshot.snapshotId,
    shocks: [{
      id: "shock:user-graph:primary",
      label: `Stress ${first.label}`,
      target: { ids: [first.id] },
      operation: "reduce_supply",
      magnitude: 0.5,
      unit: "share",
      startsAt: start,
      rationale: "User-selected scenario parameter; not an observation.",
      sourceIds: [],
    }],
    propagation: {
      engine: "dependency_cascade",
      transmission: 0.75,
      maxIterations: 100,
      tolerance: 1e-9,
      horizonsDays: [7, 30, 90],
      bounds: ["lower", "central", "upper"],
    },
    interventions: [],
    objectives: [{ id: "objective:user:risk", metric: "residual_impact", sense: "minimize" }],
    constraints: {},
    limitations: [
      "User-provided topology and weights are not independently validated.",
      "Outputs are scenarios, not forecasts, causal estimates, or realized losses.",
    ],
  };
}
