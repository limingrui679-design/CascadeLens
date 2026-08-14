"""WorldGraph contract validation, sealing, and querying."""

from __future__ import annotations

import copy
import re
from collections import defaultdict
from typing import Any

from .canonical import digest_canonical
from .errors import ValidationIssue, assert_no_errors
from .evidence import EVIDENCE_GRADES, Bound, included_in_bound
from .temporal import is_datetime, is_visible_at, parse_datetime
from .version import SCHEMA_VERSION

NODE_KINDS = {
    "country",
    "region",
    "product",
    "industry",
    "legal_entity",
    "facility",
    "port",
    "route",
    "security",
    "fund",
    "medicine",
    "policy",
    "event",
    "metric",
}
RELATION_KINDS = {
    "trades_to",
    "supplies",
    "inputs_to",
    "depends_on",
    "owns",
    "holds",
    "located_in",
    "connects_to",
    "substitute_for",
    "regulated_by",
    "exposed_to",
    "disclosed_relation",
}
_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:/-]{1,127}$")
_SHA256 = re.compile(r"^[a-f0-9]{64}$")
_TOP_LEVEL_FIELDS = {
    "schemaVersion",
    "snapshotId",
    "title",
    "decisionCutoff",
    "generatedAt",
    "contentDigest",
    "sources",
    "nodes",
    "edges",
}
_SOURCE_FIELDS = {
    "id",
    "title",
    "publisher",
    "uri",
    "retrievedAt",
    "availableAt",
    "publishedAt",
    "sha256",
    "contentType",
    "artifactKind",
    "digestScope",
    "bytes",
    "role",
    "license",
}
_LICENSE_FIELDS = {"mode", "name", "termsUri", "spdx", "notes"}
_NODE_FIELDS = {
    "id",
    "kind",
    "label",
    "description",
    "jurisdiction",
    "validFrom",
    "validTo",
    "observedAt",
    "supersededAt",
    "properties",
    "evidence",
}
_EDGE_FIELDS = {
    "id",
    "from",
    "to",
    "relation",
    "weight",
    "validFrom",
    "validTo",
    "observedAt",
    "supersededAt",
    "properties",
    "evidence",
}
_WEIGHT_FIELDS = {"value", "lower", "upper", "unit"}
_EVIDENCE_FIELDS = {"grade", "confidence", "sourceIds", "reviewStatus", "reviewRecordId"}


def _issue(
    issues: list[ValidationIssue],
    path: str,
    code: str,
    message: str,
    severity: str = "error",
) -> None:
    issues.append(ValidationIssue(path, code, message, severity))  # type: ignore[arg-type]


def _mapping(value: Any) -> bool:
    return isinstance(value, dict)


def _reject_unknown(
    value: dict[str, Any], allowed: set[str], path: str, issues: list[ValidationIssue]
) -> None:
    for field in sorted(set(value) - allowed):
        location = field if path == "$" else f"{path}.{field}"
        _issue(issues, location, "unknown_field", f"Unknown field {field}.")


def _valid_id(value: Any) -> bool:
    return isinstance(value, str) and bool(_ID.fullmatch(value))


def _validate_temporal(record: dict[str, Any], path: str, issues: list[ValidationIssue]) -> None:
    for field in ("validFrom", "observedAt"):
        if not is_datetime(record.get(field)):
            _issue(
                issues,
                f"{path}.{field}",
                "invalid_datetime",
                "Expected an ISO-8601 date-time with timezone.",
            )
    for field in ("validTo", "supersededAt"):
        if field in record and record[field] is not None and not is_datetime(record[field]):
            _issue(
                issues,
                f"{path}.{field}",
                "invalid_datetime",
                "Expected an ISO-8601 date-time with timezone.",
            )
    if (
        is_datetime(record.get("validFrom"))
        and is_datetime(record.get("validTo"))
        and parse_datetime(record["validTo"]) <= parse_datetime(record["validFrom"])
    ):
        _issue(issues, f"{path}.validTo", "invalid_interval", "validTo must be after validFrom.")
    if (
        is_datetime(record.get("observedAt"))
        and is_datetime(record.get("supersededAt"))
        and parse_datetime(record["supersededAt"]) <= parse_datetime(record["observedAt"])
    ):
        _issue(
            issues,
            f"{path}.supersededAt",
            "invalid_interval",
            "supersededAt must be after observedAt.",
        )


def _validate_evidence(value: Any, path: str, issues: list[ValidationIssue]) -> None:
    if not _mapping(value):
        _issue(issues, path, "invalid_evidence", "Evidence must be an object.")
        return
    _reject_unknown(value, _EVIDENCE_FIELDS, path, issues)
    if value.get("grade") not in EVIDENCE_GRADES:
        _issue(issues, f"{path}.grade", "invalid_evidence_grade", "Unknown evidence grade.")
    confidence = value.get("confidence")
    if (
        not isinstance(confidence, (int, float))
        or isinstance(confidence, bool)
        or not 0 <= confidence <= 1
    ):
        _issue(
            issues,
            f"{path}.confidence",
            "invalid_confidence",
            "Confidence must be between 0 and 1.",
        )
    source_ids = value.get("sourceIds")
    if (
        not isinstance(source_ids, list)
        or not source_ids
        or not all(isinstance(item, str) for item in source_ids)
    ):
        _issue(
            issues,
            f"{path}.sourceIds",
            "missing_sources",
            "Evidence must cite at least one source.",
        )
    elif len(source_ids) != len(set(source_ids)):
        _issue(issues, f"{path}.sourceIds", "duplicate_sources", "sourceIds must be unique.")
    if value.get("reviewStatus") not in {"not_required", "pending", "verified", "rejected"}:
        _issue(issues, f"{path}.reviewStatus", "invalid_review_status", "Unknown review status.")
    if value.get("reviewStatus") == "verified" and not value.get("reviewRecordId"):
        _issue(
            issues,
            f"{path}.reviewRecordId",
            "missing_review_record",
            "Verified evidence needs a review record.",
        )


def validate_snapshot(
    snapshot: Any,
    *,
    replay: bool = True,
    require_digest: bool = True,
) -> list[ValidationIssue]:
    """Validate a sealed or draft WorldGraph snapshot without mutating it."""

    issues: list[ValidationIssue] = []
    if not _mapping(snapshot):
        return [ValidationIssue("$", "invalid_document", "WorldGraph must be an object.")]
    _reject_unknown(snapshot, _TOP_LEVEL_FIELDS, "$", issues)
    if snapshot.get("schemaVersion") != SCHEMA_VERSION:
        _issue(issues, "schemaVersion", "unsupported_schema", f"Expected {SCHEMA_VERSION}.")
    if not _valid_id(snapshot.get("snapshotId")):
        _issue(issues, "snapshotId", "invalid_id", "Use 2-128 URL-safe identifier characters.")
    for field in ("title",):
        if not isinstance(snapshot.get(field), str) or not snapshot[field].strip():
            _issue(issues, field, "required", f"{field} is required.")
    for field in ("decisionCutoff", "generatedAt"):
        if not is_datetime(snapshot.get(field)):
            _issue(
                issues, field, "invalid_datetime", "Expected an ISO-8601 date-time with timezone."
            )
    digest = snapshot.get("contentDigest")
    if require_digest and (not isinstance(digest, str) or not _SHA256.fullmatch(digest)):
        _issue(
            issues, "contentDigest", "invalid_digest", "A sealed snapshot needs a SHA-256 digest."
        )

    sources = snapshot.get("sources")
    nodes = snapshot.get("nodes")
    edges = snapshot.get("edges")
    if not isinstance(sources, list):
        _issue(issues, "sources", "invalid_sources", "sources must be an array.")
        sources = []
    if not isinstance(nodes, list) or not nodes:
        _issue(issues, "nodes", "invalid_nodes", "At least one node is required.")
        nodes = []
    if not isinstance(edges, list):
        _issue(issues, "edges", "invalid_edges", "edges must be an array.")
        edges = []

    source_by_id: dict[str, dict[str, Any]] = {}
    for index, source in enumerate(sources):
        path = f"sources[{index}]"
        if not _mapping(source):
            _issue(issues, path, "invalid_source", "Source must be an object.")
            continue
        _reject_unknown(source, _SOURCE_FIELDS, path, issues)
        source_id = source.get("id")
        if not _valid_id(source_id):
            _issue(issues, f"{path}.id", "invalid_id", "Source id is invalid.")
        elif source_id in source_by_id:
            _issue(issues, f"{path}.id", "duplicate_id", f"Duplicate source id {source_id}.")
        else:
            source_by_id[source_id] = source
        for field in ("retrievedAt", "availableAt"):
            if not is_datetime(source.get(field)):
                _issue(
                    issues,
                    f"{path}.{field}",
                    "invalid_datetime",
                    "Expected an ISO-8601 date-time with timezone.",
                )
        for field in ("title", "publisher", "contentType"):
            if not isinstance(source.get(field), str) or not source[field].strip():
                _issue(issues, f"{path}.{field}", "required", f"{field} is required.")
        if not isinstance(source.get("uri"), str) or not source["uri"].startswith("https://"):
            _issue(issues, f"{path}.uri", "invalid_uri", "Source URI must use HTTPS.")
        if source.get("artifactKind") not in {
            "raw_snapshot",
            "normalized_snapshot",
            "query_manifest",
            "citation_record",
        }:
            _issue(
                issues, f"{path}.artifactKind", "invalid_artifact_kind", "Unknown artifact kind."
            )
        if source.get("digestScope") not in {"exact_bytes", "canonical_record"}:
            _issue(issues, f"{path}.digestScope", "invalid_digest_scope", "Unknown digest scope.")
        if source.get("role") not in {"input", "context", "outcome"}:
            _issue(issues, f"{path}.role", "invalid_source_role", "Unknown source role.")
        if source.get("bytes") is not None and (
            not isinstance(source["bytes"], int)
            or isinstance(source["bytes"], bool)
            or source["bytes"] < 0
        ):
            _issue(issues, f"{path}.bytes", "invalid_bytes", "bytes must be non-negative.")
        if source.get("publishedAt") is not None and not is_datetime(source.get("publishedAt")):
            _issue(
                issues,
                f"{path}.publishedAt",
                "invalid_datetime",
                "Expected an ISO-8601 date-time with timezone.",
            )
        if not isinstance(source.get("sha256"), str) or not _SHA256.fullmatch(source["sha256"]):
            _issue(
                issues, f"{path}.sha256", "invalid_sha256", "Expected a lowercase SHA-256 digest."
            )
        license_record = source.get("license")
        if not _mapping(license_record) or license_record.get("mode") not in {
            "redistributable",
            "download_on_run",
            "user_provided",
        }:
            _issue(
                issues, f"{path}.license", "invalid_license", "A redistribution mode is required."
            )
        else:
            _reject_unknown(license_record, _LICENSE_FIELDS, f"{path}.license", issues)
            if (
                not isinstance(license_record.get("name"), str)
                or not license_record["name"].strip()
            ):
                _issue(issues, f"{path}.license.name", "required", "License name is required.")
            terms_uri = license_record.get("termsUri")
            if not isinstance(terms_uri, str) or not terms_uri.startswith("https://"):
                _issue(
                    issues,
                    f"{path}.license.termsUri",
                    "invalid_uri",
                    "License terms URI must use HTTPS.",
                )
        if (
            replay
            and is_datetime(source.get("availableAt"))
            and is_datetime(snapshot.get("decisionCutoff"))
            and source.get("role") != "outcome"
            and parse_datetime(source["availableAt"]) > parse_datetime(snapshot["decisionCutoff"])
        ):
            _issue(
                issues,
                f"{path}.availableAt",
                "future_source",
                "Replay input was unavailable at the decision cutoff.",
            )

    node_ids: set[str] = set()
    for index, node in enumerate(nodes):
        path = f"nodes[{index}]"
        if not _mapping(node):
            _issue(issues, path, "invalid_node", "Node must be an object.")
            continue
        _reject_unknown(node, _NODE_FIELDS, path, issues)
        node_id = node.get("id")
        if not _valid_id(node_id):
            _issue(issues, f"{path}.id", "invalid_id", "Node id is invalid.")
        elif node_id in node_ids:
            _issue(issues, f"{path}.id", "duplicate_id", f"Duplicate node id {node_id}.")
        else:
            node_ids.add(node_id)
        if node.get("kind") not in NODE_KINDS:
            _issue(issues, f"{path}.kind", "invalid_node_kind", "Unknown node kind.")
        if not isinstance(node.get("label"), str) or not node["label"].strip():
            _issue(issues, f"{path}.label", "required", "Node label is required.")
        if not _mapping(node.get("properties")):
            _issue(
                issues, f"{path}.properties", "invalid_properties", "properties must be an object."
            )
        _validate_temporal(node, path, issues)
        node_evidence = node.get("evidence")
        _validate_evidence(node_evidence, f"{path}.evidence", issues)
        node_source_ids = node_evidence.get("sourceIds", []) if _mapping(node_evidence) else []
        for source_id in node_source_ids:
            source = source_by_id.get(source_id)
            if source is None:
                _issue(
                    issues,
                    f"{path}.evidence.sourceIds",
                    "unknown_source",
                    f"Unknown source {source_id}.",
                )
            elif source.get("role") == "outcome":
                _issue(
                    issues,
                    f"{path}.evidence.sourceIds",
                    "outcome_leakage",
                    "Outcome sources cannot support inputs.",
                )
        if (
            replay
            and is_datetime(node.get("observedAt"))
            and is_datetime(snapshot.get("decisionCutoff"))
            and parse_datetime(node["observedAt"]) > parse_datetime(snapshot["decisionCutoff"])
        ):
            _issue(
                issues,
                f"{path}.observedAt",
                "future_evidence",
                "Node became observable after the cutoff.",
            )

    edge_ids: set[str] = set()
    for index, edge in enumerate(edges):
        path = f"edges[{index}]"
        if not _mapping(edge):
            _issue(issues, path, "invalid_edge", "Edge must be an object.")
            continue
        _reject_unknown(edge, _EDGE_FIELDS, path, issues)
        edge_id = edge.get("id")
        if not _valid_id(edge_id):
            _issue(issues, f"{path}.id", "invalid_id", "Edge id is invalid.")
        elif edge_id in edge_ids:
            _issue(issues, f"{path}.id", "duplicate_id", f"Duplicate edge id {edge_id}.")
        else:
            edge_ids.add(edge_id)
        for field in ("from", "to"):
            if edge.get(field) not in node_ids:
                _issue(
                    issues, f"{path}.{field}", "unknown_node", f"Unknown node {edge.get(field)}."
                )
        if edge.get("from") == edge.get("to"):
            _issue(issues, path, "self_loop", "Self-loop edges are not supported.")
        if edge.get("relation") not in RELATION_KINDS:
            _issue(issues, f"{path}.relation", "invalid_relation", "Unknown relation kind.")
        weight = edge.get("weight")
        if not _mapping(weight):
            _issue(issues, f"{path}.weight", "invalid_weight", "weight must be an object.")
        else:
            _reject_unknown(weight, _WEIGHT_FIELDS, f"{path}.weight", issues)
            for field in ("value", "lower", "upper"):
                value = weight.get(field)
                if value is not None and (
                    not isinstance(value, (int, float))
                    or isinstance(value, bool)
                    or not 0 <= value <= 1
                ):
                    _issue(
                        issues,
                        f"{path}.weight.{field}",
                        "invalid_weight",
                        "Dependency weights must be between 0 and 1.",
                    )
            if "value" not in weight:
                _issue(issues, f"{path}.weight.value", "required", "Weight value is required.")
            if not isinstance(weight.get("unit"), str) or not weight["unit"].strip():
                _issue(issues, f"{path}.weight.unit", "required", "Weight unit is required.")
            if (
                isinstance(weight.get("lower"), (int, float))
                and isinstance(weight.get("value"), (int, float))
                and weight["lower"] > weight["value"]
            ):
                _issue(
                    issues, f"{path}.weight.lower", "invalid_bound", "lower cannot exceed value."
                )
            if (
                isinstance(weight.get("upper"), (int, float))
                and isinstance(weight.get("value"), (int, float))
                and weight["upper"] < weight["value"]
            ):
                _issue(
                    issues, f"{path}.weight.upper", "invalid_bound", "upper cannot be below value."
                )
        _validate_temporal(edge, path, issues)
        edge_evidence = edge.get("evidence")
        _validate_evidence(edge_evidence, f"{path}.evidence", issues)
        edge_source_ids = edge_evidence.get("sourceIds", []) if _mapping(edge_evidence) else []
        for source_id in edge_source_ids:
            source = source_by_id.get(source_id)
            if source is None:
                _issue(
                    issues,
                    f"{path}.evidence.sourceIds",
                    "unknown_source",
                    f"Unknown source {source_id}.",
                )
            elif source.get("role") == "outcome":
                _issue(
                    issues,
                    f"{path}.evidence.sourceIds",
                    "outcome_leakage",
                    "Outcome sources cannot support inputs.",
                )
        if (
            replay
            and is_datetime(edge.get("observedAt"))
            and is_datetime(snapshot.get("decisionCutoff"))
            and parse_datetime(edge["observedAt"]) > parse_datetime(snapshot["decisionCutoff"])
        ):
            _issue(
                issues,
                f"{path}.observedAt",
                "future_evidence",
                "Edge became observable after the cutoff.",
            )
    return issues


def snapshot_draft(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        key: copy.deepcopy(snapshot[key])
        for key in (
            "schemaVersion",
            "snapshotId",
            "title",
            "decisionCutoff",
            "generatedAt",
            "nodes",
            "edges",
            "sources",
        )
    }


def seal_snapshot(draft: dict[str, Any]) -> dict[str, Any]:
    """Validate, canonicalize ordering, and content-address a draft snapshot."""

    normalized = copy.deepcopy(draft)
    normalized.pop("contentDigest", None)
    for field in ("sources", "nodes", "edges"):
        normalized[field] = sorted(
            normalized.get(field, []), key=lambda item: item["id"].encode("utf-8")
        )
    assert_no_errors(
        "Invalid WorldGraph snapshot", validate_snapshot(normalized, require_digest=False)
    )
    normalized["contentDigest"] = digest_canonical(normalized)
    return normalized


def verify_snapshot(snapshot: dict[str, Any]) -> list[ValidationIssue]:
    issues = validate_snapshot(snapshot, require_digest=True)
    if not any(issue.code == "invalid_digest" for issue in issues):
        actual = digest_canonical(snapshot_draft(snapshot))
        if actual != snapshot.get("contentDigest"):
            _issue(
                issues,
                "contentDigest",
                "digest_mismatch",
                "Snapshot content does not match its digest.",
            )
    return issues


def query_snapshot(
    snapshot: dict[str, Any], valid_at: str, known_at: str
) -> dict[str, list[dict[str, Any]]]:
    nodes = [node for node in snapshot["nodes"] if is_visible_at(node, valid_at, known_at)]
    node_ids = {node["id"] for node in nodes}
    edges = [
        edge
        for edge in snapshot["edges"]
        if edge["from"] in node_ids
        and edge["to"] in node_ids
        and is_visible_at(edge, valid_at, known_at)
    ]
    return {"nodes": nodes, "edges": edges}


def edge_weight(edge: dict[str, Any], bound: Bound) -> float:
    weight = edge["weight"]
    if bound == "lower":
        return float(weight.get("lower", weight["value"]))
    if bound == "upper":
        return float(weight.get("upper", weight["value"]))
    return float(weight["value"])


def audit_flow_conservation(
    snapshot: dict[str, Any], bound: Bound, tolerance: float = 1e-9
) -> list[dict[str, Any]]:
    totals: dict[tuple[str, str], float] = defaultdict(float)
    for edge in snapshot["edges"]:
        if edge["relation"] not in {"depends_on", "inputs_to", "supplies"}:
            continue
        if edge["weight"].get("unit") != "share":
            continue
        if not included_in_bound(edge["evidence"]["grade"], bound):
            continue
        totals[(edge["to"], edge["relation"])] += edge_weight(edge, bound)
    issues = [
        {
            "nodeId": node_id,
            "relation": relation,
            "bound": bound,
            "incomingShare": total,
            "excess": total - 1,
        }
        for (node_id, relation), total in totals.items()
        if total > 1 + tolerance
    ]
    return sorted(issues, key=lambda item: (-item["excess"], item["nodeId"], item["relation"]))
