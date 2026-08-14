from __future__ import annotations

import copy
import unittest

from cascadelens import analyze, seal_snapshot
from cascadelens.canonical import sha256_text
from cascadelens.demo import demo_scenario, demo_snapshot


def _replay_fixture():
    snapshot = copy.deepcopy(demo_snapshot())
    snapshot.pop("contentDigest")
    snapshot["sources"].append(
        {
            "id": "source:demo:outcomes",
            "title": "Separated demonstration outcomes",
            "publisher": "CascadeLens test fixture",
            "uri": "https://github.com/limingrui679-design/CascadeLens/tree/main/tests_python",
            "retrievedAt": "2026-02-10T00:00:00Z",
            "availableAt": "2026-02-10T00:00:00Z",
            "publishedAt": "2026-02-10T00:00:00Z",
            "sha256": sha256_text("separated demonstration outcomes"),
            "contentType": "application/json",
            "artifactKind": "normalized_snapshot",
            "digestScope": "exact_bytes",
            "role": "outcome",
            "license": {
                "mode": "redistributable",
                "name": "Apache-2.0",
                "spdx": "Apache-2.0",
                "termsUri": "https://www.apache.org/licenses/LICENSE-2.0",
            },
        }
    )
    snapshot = seal_snapshot(snapshot)
    scenario = copy.deepcopy(demo_scenario())
    scenario["classification"] = "quasi_historical"
    scenario["shocks"][0]["sourceIds"] = ["source:demo:assumptions"]
    outcomes = [
        {
            "nodeId": node_id,
            "observedImpact": observed,
            "sourceId": "source:demo:outcomes",
            "targetMetric": "time_weighted_mean_node_impact",
            "horizonDays": 7,
            "windowStart": "2026-01-02T00:00:00Z",
            "windowEnd": "2026-01-09T00:00:00Z",
            "availableAt": "2026-02-10T00:00:00Z",
        }
        for node_id, observed in (
            ("node:demo:route", 0.8),
            ("node:demo:input", 0.5),
        )
    ]
    return snapshot, scenario, outcomes


class BenchmarkTests(unittest.TestCase):
    def test_scores_only_separated_outcome_sources_after_complete_window(self) -> None:
        snapshot, scenario, outcomes = _replay_fixture()
        benchmark = analyze(snapshot, scenario, outcomes=outcomes).benchmark
        self.assertEqual("historically_scored", benchmark["status"])
        self.assertEqual(2, benchmark["sampleSize"])
        self.assertEqual([], benchmark["leakageIssues"])

    def test_blocks_input_source_reuse_and_incomplete_outcome_windows(self) -> None:
        snapshot, scenario, outcomes = _replay_fixture()
        outcomes[0]["sourceId"] = "source:demo:assumptions"
        outcomes[0]["windowEnd"] = "2026-01-08T00:00:00Z"
        benchmark = analyze(snapshot, scenario, outcomes=outcomes).benchmark
        self.assertEqual("blocked", benchmark["status"])
        self.assertTrue(any("not outcome-only" in issue for issue in benchmark["leakageIssues"]))
        self.assertTrue(any("complete 7-day" in issue for issue in benchmark["leakageIssues"]))


if __name__ == "__main__":
    unittest.main()
