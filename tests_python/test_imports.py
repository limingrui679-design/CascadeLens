from __future__ import annotations

import json
import unittest

from cascadelens import (
    default_scenario,
    graph_from_csv,
    graph_from_graphml,
    graph_from_json,
    graph_from_networkx,
    run_cascade_bounds,
    verify_snapshot,
)

CUTOFF = "2026-01-01T00:00:00Z"


class FakeNetworkX:
    def nodes(self, data: bool = False):
        values = [
            ("supplier", {"label": "Supplier", "kind": "legal_entity"}),
            ("plant", {"label": "Plant", "kind": "facility"}),
        ]
        return values if data else [item[0] for item in values]

    def edges(self, data: bool = False, keys: bool = False):
        values = [("supplier", "plant", {"weight": 0.7})]
        return values if data else [item[:2] for item in values]

    def is_multigraph(self) -> bool:
        return False


class FakeUndirectedNetworkX(FakeNetworkX):
    def is_directed(self) -> bool:
        return False


class ImportTests(unittest.TestCase):
    def _assert_runnable(self, snapshot):
        self.assertEqual([], verify_snapshot(snapshot))
        result = run_cascade_bounds(snapshot, default_scenario(snapshot))
        self.assertEqual("upper", result["upper"]["bound"])
        self.assertGreaterEqual(
            result["upper"]["totalWeightedImpact"], result["central"]["totalWeightedImpact"]
        )

    def test_csv_edge_list(self) -> None:
        snapshot = graph_from_csv(
            "source,target,weight,source_label,target_label\nA,B,0.7,Supplier,Plant\nB,C,0.5,Plant,Market\n",
            decision_cutoff=CUTOFF,
        )
        self.assertEqual((3, 2), (len(snapshot["nodes"]), len(snapshot["edges"])))
        self._assert_runnable(snapshot)

    def test_simple_json(self) -> None:
        snapshot = graph_from_json(
            {
                "title": "User graph",
                "nodes": [{"id": "a", "label": "A"}, {"id": "b", "label": "B"}],
                "edges": [{"source": "a", "target": "b", "weight": 0.6}],
            },
            decision_cutoff=CUTOFF,
        )
        self._assert_runnable(snapshot)
        self.assertEqual(snapshot, graph_from_json(json.dumps(snapshot)))

    def test_graphml(self) -> None:
        snapshot = graph_from_graphml(
            """<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="label" for="node" attr.name="label" attr.type="string"/>
  <key id="weight" for="edge" attr.name="weight" attr.type="double"/>
  <graph id="G" edgedefault="directed">
    <node id="a"><data key="label">Source</data></node>
    <node id="b"><data key="label">Target</data></node>
    <edge source="a" target="b"><data key="weight">0.8</data></edge>
  </graph>
</graphml>""",
            decision_cutoff=CUTOFF,
        )
        self._assert_runnable(snapshot)

    def test_networkx_protocol_without_required_dependency(self) -> None:
        snapshot = graph_from_networkx(FakeNetworkX(), decision_cutoff=CUTOFF)
        self.assertEqual(
            "Supplier",
            snapshot["nodes"][1]["label"]
            if snapshot["nodes"][1]["id"].endswith("supplier")
            else snapshot["nodes"][0]["label"],
        )
        self._assert_runnable(snapshot)

    def test_undirected_networkx_edges_expand_in_both_directions(self) -> None:
        snapshot = graph_from_networkx(FakeUndirectedNetworkX(), decision_cutoff=CUTOFF)
        self.assertEqual(2, len(snapshot["edges"]))
        self.assertEqual(
            {("node:user:supplier", "node:user:plant"), ("node:user:plant", "node:user:supplier")},
            {(edge["from"], edge["to"]) for edge in snapshot["edges"]},
        )

    def test_rejects_invalid_numeric_weights_and_duplicate_nodes(self) -> None:
        with self.assertRaisesRegex(ValueError, "finite numeric value"):
            graph_from_csv("source,target,weight\nA,B,nan\n", decision_cutoff=CUTOFF)
        with self.assertRaisesRegex(ValueError, "duplicate node id"):
            graph_from_json(
                {
                    "nodes": [{"id": "a"}, {"id": "a"}],
                    "edges": [],
                },
                decision_cutoff=CUTOFF,
            )

        with self.assertRaisesRegex(ValueError, "lower <= weight <= upper"):
            graph_from_csv(
                "source,target,weight,lower,upper\nA,B,0.5,0.8,0.9\n",
                decision_cutoff=CUTOFF,
            )

    def test_rejects_graphml_document_type_declarations(self) -> None:
        with self.assertRaisesRegex(ValueError, "declarations are not supported"):
            graph_from_graphml(
                '<!DOCTYPE graphml [<!ENTITY x "expanded">]><graphml>&x;</graphml>',
                decision_cutoff=CUTOFF,
            )

    def test_undirected_graphml_edges_expand_in_both_directions(self) -> None:
        snapshot = graph_from_graphml(
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">'
            '<graph edgedefault="undirected"><node id="a"/><node id="b"/>'
            '<edge source="a" target="b"/></graph></graphml>',
            decision_cutoff=CUTOFF,
        )
        self.assertEqual(2, len(snapshot["edges"]))
        self.assertEqual(
            {("node:user:a", "node:user:b"), ("node:user:b", "node:user:a")},
            {(edge["from"], edge["to"]) for edge in snapshot["edges"]},
        )


if __name__ == "__main__":
    unittest.main()
