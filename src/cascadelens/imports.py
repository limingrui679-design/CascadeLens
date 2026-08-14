"""Bring-your-own-graph adapters for JSON, CSV, GraphML, and NetworkX."""

from __future__ import annotations

import csv
import io
import json
import math
import re
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

from .canonical import sha256_bytes
from .temporal import isoformat
from .validation import NODE_KINDS, RELATION_KINDS, seal_snapshot, verify_snapshot
from .version import SCHEMA_VERSION

MAX_GRAPH_BYTES = 25_000_000
MAX_NODES = 100_000
MAX_EDGES = 500_000
_SAFE = re.compile(r"[^a-z0-9._-]+")


class NetworkXLike(Protocol):
    def nodes(self, data: bool = False): ...

    def edges(self, data: bool = False, keys: bool = False): ...

    def is_multigraph(self) -> bool: ...


def _slug(value: Any) -> str:
    text = _SAFE.sub("-", str(value).strip().lower()).strip("-._")
    if not text:
        text = sha256_bytes(str(value).encode("utf-8"))[:16]
    return text[:80]


def _now() -> str:
    return isoformat(datetime.now(UTC).replace(microsecond=0))


def _float(value: Any, fallback: float) -> float:
    if value is None or value == "":
        return fallback
    try:
        parsed = float(value)
    except (TypeError, ValueError) as error:
        raise ValueError(f"Expected a numeric value between 0 and 1, received {value!r}") from error
    if not math.isfinite(parsed) or not 0 <= parsed <= 1:
        raise ValueError(f"Expected a finite numeric value between 0 and 1, received {value!r}")
    return parsed


def _source_record(raw: bytes, cutoff: str, title: str) -> dict[str, Any]:
    return {
        "id": "source:user-provided:graph",
        "title": title,
        "publisher": "User provided",
        "uri": "https://github.com/limingrui679-design/CascadeLens/blob/main/docs/tutorials/02_bring_your_own_graph.md",
        "retrievedAt": cutoff,
        "availableAt": cutoff,
        "publishedAt": cutoff,
        "sha256": sha256_bytes(raw),
        "contentType": "application/octet-stream",
        "artifactKind": "raw_snapshot",
        "digestScope": "exact_bytes",
        "bytes": len(raw),
        "role": "input",
        "license": {
            "mode": "user_provided",
            "name": "User-provided data; user controls terms",
            "termsUri": "https://github.com/limingrui679-design/CascadeLens/blob/main/docs/DATA_LICENSES.md",
            "notes": "CascadeLens does not infer redistribution rights for imported data.",
        },
    }


def _node(node_id: str, label: str, attrs: dict[str, Any], cutoff: str) -> dict[str, Any]:
    kind = str(attrs.get("kind", "metric"))
    if kind not in NODE_KINDS:
        kind = "metric"
    criticality = _float(attrs.get("criticality", 1), 1)
    buffer_share = _float(attrs.get("bufferShare", attrs.get("buffer_share", 0)), 0)
    properties = {
        key: value
        for key, value in attrs.items()
        if key not in {"id", "label", "kind", "criticality", "bufferShare", "buffer_share"}
        and isinstance(value, (str, int, float, bool))
    }
    properties.update(
        {
            "criticality": criticality,
            "bufferShare": buffer_share,
            "factualStatus": "user_provided_unverified",
        }
    )
    return {
        "id": node_id,
        "kind": kind,
        "label": label,
        "description": "Imported user-provided node; not independently verified by CascadeLens.",
        "validFrom": cutoff,
        "observedAt": cutoff,
        "properties": properties,
        "evidence": {
            "grade": "MODEL_INFERRED",
            "confidence": 0.25,
            "sourceIds": ["source:user-provided:graph"],
            "reviewStatus": "not_required",
        },
    }


def _edge(
    edge_id: str,
    source_id: str,
    target_id: str,
    attrs: dict[str, Any],
    cutoff: str,
) -> dict[str, Any]:
    relation = str(attrs.get("relation", "depends_on"))
    if relation not in RELATION_KINDS:
        relation = "depends_on"
    value = _float(attrs.get("weight", attrs.get("value", 0.5)), 0.5)
    lower = _float(attrs.get("lower", value), value)
    upper = _float(attrs.get("upper", value), value)
    if not lower <= value <= upper:
        raise ValueError("Edge uncertainty requires lower <= weight <= upper")
    properties = {
        key: item
        for key, item in attrs.items()
        if key
        not in {
            "source",
            "target",
            "from",
            "to",
            "id",
            "weight",
            "value",
            "lower",
            "upper",
            "relation",
        }
        and isinstance(item, (str, int, float, bool))
    }
    properties.update(
        {
            "eligibleForPrimaryEstimate": False,
            "factualStatus": "user_provided_unverified",
        }
    )
    return {
        "id": edge_id,
        "from": source_id,
        "to": target_id,
        "relation": relation,
        "weight": {"value": value, "lower": lower, "upper": upper, "unit": "share"},
        "validFrom": cutoff,
        "observedAt": cutoff,
        "properties": properties,
        "evidence": {
            "grade": "MODEL_INFERRED",
            "confidence": 0.25,
            "sourceIds": ["source:user-provided:graph"],
            "reviewStatus": "not_required",
        },
    }


def _assemble(
    raw: bytes,
    title: str,
    nodes: list[tuple[Any, dict[str, Any]]],
    edges: list[tuple[Any, Any, dict[str, Any]]],
    *,
    decision_cutoff: str | None = None,
) -> dict[str, Any]:
    if not nodes:
        raise ValueError("Imported graph contains no nodes")
    if len(nodes) > MAX_NODES or len(edges) > MAX_EDGES:
        raise ValueError(f"Imported graph exceeds {MAX_NODES:,} nodes or {MAX_EDGES:,} edges")
    cutoff = decision_cutoff or _now()
    ids: dict[str, str] = {}
    normalized_nodes: list[dict[str, Any]] = []
    for raw_id, attrs in nodes:
        key = str(raw_id)
        if key in ids:
            raise ValueError(f"Imported graph contains duplicate node id {key!r}")
        base = f"node:user:{_slug(key)}"
        node_id = base
        counter = 2
        while node_id in ids.values():
            node_id = f"{base}-{counter}"
            counter += 1
        ids[key] = node_id
        normalized_nodes.append(_node(node_id, str(attrs.get("label", raw_id)), attrs, cutoff))
    normalized_edges: list[dict[str, Any]] = []
    for index, (raw_source, raw_target, attrs) in enumerate(edges, start=1):
        source_id = ids.get(str(raw_source))
        target_id = ids.get(str(raw_target))
        if source_id is None or target_id is None:
            raise ValueError(f"Edge {index} references a node missing from the node set")
        normalized_edges.append(
            _edge(f"edge:user:{index:06d}", source_id, target_id, attrs, cutoff)
        )
    draft = {
        "schemaVersion": SCHEMA_VERSION,
        "snapshotId": f"snapshot:user:{sha256_bytes(raw)[:20]}",
        "title": title,
        "decisionCutoff": cutoff,
        "generatedAt": cutoff,
        "nodes": normalized_nodes,
        "edges": normalized_edges,
        "sources": [_source_record(raw, cutoff, title)],
    }
    return seal_snapshot(draft)


def graph_from_json(
    value: str | bytes | dict[str, Any],
    *,
    decision_cutoff: str | None = None,
) -> dict[str, Any]:
    """Load a full WorldGraph or normalize a simple nodes/edges JSON object."""

    if isinstance(value, dict):
        document = value
        raw = json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")
    else:
        raw = value.encode("utf-8") if isinstance(value, str) else value
        if len(raw) > MAX_GRAPH_BYTES:
            raise ValueError("Graph input exceeds the 25 MB safety limit")
        document = json.loads(raw)
    if len(raw) > MAX_GRAPH_BYTES:
        raise ValueError("Graph input exceeds the 25 MB safety limit")
    if not isinstance(document, dict):
        raise ValueError("JSON graph must be an object")
    if document.get("schemaVersion") == SCHEMA_VERSION and "contentDigest" in document:
        issues = verify_snapshot(document)
        if issues:
            rendered = "; ".join(issue.render() for issue in issues)
            raise ValueError(f"Invalid WorldGraph snapshot: {rendered}")
        return document
    raw_nodes = document.get("nodes")
    raw_edges = document.get("edges")
    if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list):
        raise ValueError("Simple JSON graph requires nodes and edges arrays")
    nodes: list[tuple[Any, dict[str, Any]]] = []
    for index, item in enumerate(raw_nodes):
        if isinstance(item, str):
            nodes.append((item, {"label": item}))
        elif isinstance(item, dict):
            raw_id = item.get("id", item.get("name"))
            if raw_id is None:
                raise ValueError(f"nodes[{index}] requires id or name")
            nodes.append((raw_id, item))
        else:
            raise ValueError(f"nodes[{index}] must be a string or object")
    edges: list[tuple[Any, Any, dict[str, Any]]] = []
    for index, item in enumerate(raw_edges):
        if not isinstance(item, dict):
            raise ValueError(f"edges[{index}] must be an object")
        source = item.get("source", item.get("from"))
        target = item.get("target", item.get("to"))
        if source is None or target is None:
            raise ValueError(f"edges[{index}] requires source/from and target/to")
        edges.append((source, target, item))
    return _assemble(
        raw,
        str(document.get("title", "Imported JSON graph")),
        nodes,
        edges,
        decision_cutoff=decision_cutoff,
    )


def graph_from_csv(
    value: str | bytes,
    *,
    decision_cutoff: str | None = None,
) -> dict[str, Any]:
    """Normalize an edge-list CSV with source/target or from/to columns."""

    raw = value.encode("utf-8") if isinstance(value, str) else value
    if len(raw) > MAX_GRAPH_BYTES:
        raise ValueError("Graph input exceeds the 25 MB safety limit")
    text = raw.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("CSV graph requires a header row")
    fields = {field.strip().lower(): field for field in reader.fieldnames}
    source_field = fields.get("source", fields.get("from"))
    target_field = fields.get("target", fields.get("to"))
    if not source_field or not target_field:
        raise ValueError("CSV graph requires source/target or from/to columns")
    node_attrs: dict[str, dict[str, Any]] = {}
    edges: list[tuple[Any, Any, dict[str, Any]]] = []
    for index, row in enumerate(reader, start=2):
        source = (row.get(source_field) or "").strip()
        target = (row.get(target_field) or "").strip()
        if not source or not target:
            raise ValueError(f"CSV row {index} has an empty source or target")
        node_attrs.setdefault(source, {"label": row.get("source_label") or source})
        node_attrs.setdefault(target, {"label": row.get("target_label") or target})
        edges.append(
            (source, target, {key.strip().lower(): item for key, item in row.items() if key})
        )
    nodes = list(node_attrs.items())
    return _assemble(
        raw, "Imported CSV dependency graph", nodes, edges, decision_cutoff=decision_cutoff
    )


def graph_from_graphml(
    value: str | bytes,
    *,
    decision_cutoff: str | None = None,
) -> dict[str, Any]:
    """Normalize standard GraphML without executing extensions or fetching DTDs."""

    raw = value.encode("utf-8") if isinstance(value, str) else value
    if len(raw) > MAX_GRAPH_BYTES:
        raise ValueError("Graph input exceeds the 25 MB safety limit")
    if re.search(rb"<!\s*(?:DOCTYPE|ENTITY)\b", raw, re.IGNORECASE):
        raise ValueError("GraphML document type and entity declarations are not supported")
    root = ET.fromstring(raw)
    namespace = ""
    if root.tag.startswith("{"):
        namespace = root.tag.split("}", 1)[0] + "}"
    key_names: dict[str, str] = {}
    for key in root.findall(f"{namespace}key"):
        key_id = key.attrib.get("id")
        if key_id:
            key_names[key_id] = key.attrib.get("attr.name", key_id)
    graph = root.find(f"{namespace}graph")
    if graph is None:
        raise ValueError("GraphML document contains no graph element")

    def data(element: ET.Element) -> dict[str, Any]:
        attrs: dict[str, Any] = {}
        for child in element.findall(f"{namespace}data"):
            key = key_names.get(child.attrib.get("key", ""), child.attrib.get("key", "value"))
            attrs[key] = (child.text or "").strip()
        return attrs

    nodes: list[tuple[Any, dict[str, Any]]] = []
    for node in graph.findall(f"{namespace}node"):
        node_id = node.attrib.get("id")
        if node_id is None:
            raise ValueError("GraphML node is missing id")
        attrs = data(node)
        attrs.setdefault("label", attrs.get("name", node_id))
        nodes.append((node_id, attrs))
    edges: list[tuple[Any, Any, dict[str, Any]]] = []
    graph_is_undirected = graph.attrib.get("edgedefault") == "undirected"
    for edge in graph.findall(f"{namespace}edge"):
        source, target = edge.attrib.get("source"), edge.attrib.get("target")
        if source is None or target is None:
            raise ValueError("GraphML edge is missing source or target")
        attrs = data(edge)
        if "weight" in edge.attrib:
            attrs.setdefault("weight", edge.attrib["weight"])
        edges.append((source, target, attrs))
        directed = edge.attrib.get("directed")
        if directed == "false" or (directed != "true" and graph_is_undirected):
            edges.append((target, source, {**attrs, "graphml_undirected_expansion": True}))
    return _assemble(
        raw, "Imported GraphML dependency graph", nodes, edges, decision_cutoff=decision_cutoff
    )


def graph_from_networkx(
    graph: NetworkXLike,
    *,
    decision_cutoff: str | None = None,
) -> dict[str, Any]:
    """Normalize a NetworkX Graph, DiGraph, MultiGraph, or compatible object."""

    nodes = [(node_id, dict(attrs)) for node_id, attrs in graph.nodes(data=True)]
    edges: list[tuple[Any, Any, dict[str, Any]]] = []
    if graph.is_multigraph():
        for source, target, key, attrs in graph.edges(data=True, keys=True):
            payload = dict(attrs)
            payload.setdefault("networkx_key", str(key))
            edges.append((source, target, payload))
    else:
        edges = [(source, target, dict(attrs)) for source, target, attrs in graph.edges(data=True)]
    is_directed = getattr(graph, "is_directed", None)
    if callable(is_directed) and not is_directed():
        edges = edges + [
            (
                target,
                source,
                {**attrs, "networkx_undirected_expansion": True},
            )
            for source, target, attrs in edges
        ]
    raw = json.dumps(
        {"nodes": nodes, "edges": edges},
        ensure_ascii=False,
        sort_keys=True,
        default=str,
    ).encode("utf-8")
    return _assemble(
        raw, "Imported NetworkX dependency graph", nodes, edges, decision_cutoff=decision_cutoff
    )


def load_graph(path: str | Path, *, decision_cutoff: str | None = None) -> dict[str, Any]:
    source = Path(path)
    if not source.is_file() or source.is_symlink():
        raise ValueError(f"Expected a regular graph file: {source}")
    if source.stat().st_size > MAX_GRAPH_BYTES:
        raise ValueError("Graph input exceeds the 25 MB safety limit")
    raw = source.read_bytes()
    suffix = source.suffix.lower()
    if suffix == ".json":
        return graph_from_json(raw, decision_cutoff=decision_cutoff)
    if suffix == ".csv":
        return graph_from_csv(raw, decision_cutoff=decision_cutoff)
    if suffix in {".graphml", ".xml"}:
        return graph_from_graphml(raw, decision_cutoff=decision_cutoff)
    raise ValueError("Supported graph formats are .json, .csv, .graphml, and .xml")
