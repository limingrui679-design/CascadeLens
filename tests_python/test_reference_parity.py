from __future__ import annotations

import json
import unittest
from pathlib import Path

from cascadelens import analyze, verify_snapshot

ROOT = Path(__file__).resolve().parents[1]


class ReferenceParityTests(unittest.TestCase):
    def test_python_engine_matches_all_sixteen_published_cases(self) -> None:
        catalog = json.loads((ROOT / "content/cases/catalog.json").read_text(encoding="utf-8"))
        self.assertEqual(16, len(catalog["cases"]))
        for case in catalog["cases"]:
            with self.subTest(case=case["slug"]):
                case_root = ROOT / "content/cases" / case["slug"]
                snapshot = json.loads(
                    (case_root / "graph/snapshot.json").read_text(encoding="utf-8")
                )
                scenario = json.loads((case_root / "scenario.json").read_text(encoding="utf-8"))
                stored = json.loads(
                    (case_root / "results/cascade-bounds.json").read_text(encoding="utf-8")
                )
                result = analyze(snapshot, scenario)
                self.assertEqual([], verify_snapshot(snapshot))
                for bound in ("lower", "central", "upper"):
                    self.assertAlmostEqual(
                        stored[bound]["totalWeightedImpact"],
                        result.bounds[bound]["totalWeightedImpact"],
                        places=12,
                    )
                self.assertEqual(
                    case["recommendedBundleIds"], result.interventions["recommendedBundleIds"]
                )
                self.assertEqual("scenario_only", result.benchmark["status"])

    def test_bound_order_is_monotone_for_every_case_and_horizon(self) -> None:
        catalog = json.loads((ROOT / "content/cases/catalog.json").read_text(encoding="utf-8"))
        for case in catalog["cases"]:
            case_root = ROOT / "content/cases" / case["slug"]
            snapshot = json.loads((case_root / "graph/snapshot.json").read_text(encoding="utf-8"))
            scenario = json.loads((case_root / "scenario.json").read_text(encoding="utf-8"))
            for horizon in analyze(snapshot, scenario).bounds["horizons"]:
                lower = {item["nodeId"]: item["impact"] for item in horizon["lower"]["impacts"]}
                central = {item["nodeId"]: item["impact"] for item in horizon["central"]["impacts"]}
                upper = {item["nodeId"]: item["impact"] for item in horizon["upper"]["impacts"]}
                for node_id in upper:
                    self.assertLessEqual(lower.get(node_id, 0), central.get(node_id, 0) + 1e-12)
                    self.assertLessEqual(central.get(node_id, 0), upper[node_id] + 1e-12)


if __name__ == "__main__":
    unittest.main()
