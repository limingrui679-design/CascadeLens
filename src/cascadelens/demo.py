"""Small packaged demonstration used by the one-minute start."""

from __future__ import annotations

from typing import Any

from .canonical import sha256_text
from .validation import seal_snapshot
from .version import SCHEMA_VERSION

_CUTOFF = "2026-01-01T00:00:00Z"
_SOURCE_ID = "source:demo:assumptions"


def demo_snapshot() -> dict[str, Any]:
    labels = [
        ("route", "Critical route", "route", 1.2),
        ("input", "Time-sensitive input", "product", 1.0),
        ("plant", "Assembly capacity", "facility", 1.4),
        ("market", "Regional availability", "region", 1.5),
    ]
    nodes = [
        {
            "id": f"node:demo:{key}",
            "kind": kind,
            "label": label,
            "description": "Packaged scenario-only demonstration node.",
            "validFrom": _CUTOFF,
            "observedAt": _CUTOFF,
            "properties": {
                "criticality": criticality,
                "bufferShare": 0,
                "factualStatus": "model_construct",
            },
            "evidence": {
                "grade": "MODEL_INFERRED",
                "confidence": 0.3,
                "sourceIds": [_SOURCE_ID],
                "reviewStatus": "not_required",
            },
        }
        for key, label, kind, criticality in labels
    ]
    edge_specs = [
        ("route", "input", 0.78, 0.55, 0.9),
        ("input", "plant", 0.62, 0.4, 0.78),
        ("plant", "market", 0.54, 0.34, 0.7),
    ]
    edges = [
        {
            "id": f"edge:demo:{index}",
            "from": f"node:demo:{source}",
            "to": f"node:demo:{target}",
            "relation": "depends_on",
            "weight": {"value": value, "lower": lower, "upper": upper, "unit": "share"},
            "validFrom": _CUTOFF,
            "observedAt": _CUTOFF,
            "properties": {
                "factualStatus": "model_assumption",
                "eligibleForPrimaryEstimate": False,
            },
            "evidence": {
                "grade": "MODEL_INFERRED",
                "confidence": 0.3,
                "sourceIds": [_SOURCE_ID],
                "reviewStatus": "not_required",
            },
        }
        for index, (source, target, value, lower, upper) in enumerate(edge_specs, start=1)
    ]
    return seal_snapshot(
        {
            "schemaVersion": SCHEMA_VERSION,
            "snapshotId": "snapshot:demo:assumed-topology",
            "title": "CascadeLens packaged demonstration graph",
            "decisionCutoff": _CUTOFF,
            "generatedAt": _CUTOFF,
            "nodes": nodes,
            "edges": edges,
            "sources": [
                {
                    "id": _SOURCE_ID,
                    "title": "Packaged demonstration assumptions",
                    "publisher": "CascadeLens",
                    "uri": "https://github.com/limingrui679-design/CascadeLens/blob/main/src/cascadelens/demo.py",
                    "retrievedAt": _CUTOFF,
                    "availableAt": _CUTOFF,
                    "publishedAt": _CUTOFF,
                    "sha256": sha256_text("CascadeLens packaged demonstration assumptions v0.5.1"),
                    "contentType": "text/plain",
                    "artifactKind": "normalized_snapshot",
                    "digestScope": "exact_bytes",
                    "bytes": 55,
                    "role": "input",
                    "license": {
                        "mode": "redistributable",
                        "name": "Apache-2.0",
                        "spdx": "Apache-2.0",
                        "termsUri": "https://www.apache.org/licenses/LICENSE-2.0",
                    },
                }
            ],
        }
    )


def demo_scenario() -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "scenarioId": "python-quickstart-demo",
        "title": "Critical route disruption",
        "summary": "A packaged scenario-only dependency cascade for the Python quick start.",
        "classification": "synthetic_stress",
        "decisionCutoff": _CUTOFF,
        "graphSnapshotId": "snapshot:demo:assumed-topology",
        "shocks": [
            {
                "id": "shock:demo:route",
                "label": "Critical route unavailable",
                "target": {"ids": ["node:demo:route"]},
                "operation": "disable",
                "magnitude": 1,
                "unit": "share",
                "startsAt": "2026-01-02T00:00:00Z",
                "endsAt": "2026-02-01T00:00:00Z",
                "rationale": "Illustrative stress parameter, not an observed event.",
                "sourceIds": [],
            }
        ],
        "propagation": {
            "engine": "dependency_cascade",
            "transmission": 0.8,
            "maxIterations": 100,
            "tolerance": 1e-9,
            "horizonsDays": [7, 30, 90],
            "bounds": ["lower", "central", "upper"],
        },
        "interventions": [
            {
                "id": "intervention:demo:buffer",
                "label": "Increase input buffer",
                "type": "buffer",
                "targetNodeIds": ["node:demo:input"],
                "targetEdgeIds": [],
                "cost": 8,
                "costUnit": "normalized_cost",
                "leadTimeDays": 7,
                "effect": 0.35,
                "evidenceGrade": "MODEL_INFERRED",
                "rationale": "Illustrative intervention parameter.",
            },
            {
                "id": "intervention:demo:reroute",
                "label": "Activate alternate route",
                "type": "reroute",
                "targetNodeIds": [],
                "targetEdgeIds": ["edge:demo:1"],
                "cost": 11,
                "costUnit": "normalized_cost",
                "leadTimeDays": 14,
                "effect": 0.5,
                "evidenceGrade": "MODEL_INFERRED",
                "rationale": "Illustrative intervention parameter.",
            },
        ],
        "objectives": [
            {"id": "objective:demo:risk", "metric": "residual_impact", "sense": "minimize"},
            {"id": "objective:demo:cost", "metric": "cost", "sense": "minimize"},
        ],
        "constraints": {
            "budget": 20,
            "budgetUnit": "normalized_cost",
            "maxInterventions": 2,
            "maxLeadTimeDays": 30,
        },
        "limitations": [
            "All nodes, links, weights, shocks, costs, and effects are explicit model assumptions.",
            "Outputs are not forecasts, causal estimates, realized losses, or external validation.",
        ],
    }
