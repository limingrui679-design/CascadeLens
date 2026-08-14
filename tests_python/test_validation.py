from __future__ import annotations

import copy
import unittest

from cascadelens import validate_scenario, verify_snapshot
from cascadelens.demo import demo_scenario, demo_snapshot


class ValidationTests(unittest.TestCase):
    def test_worldgraph_rejects_unknown_fields_without_crashing_on_bad_evidence(self) -> None:
        snapshot = demo_snapshot()
        snapshot["unexpected"] = True
        snapshot["nodes"][0]["evidence"] = "not-an-object"
        codes = {(issue.path, issue.code) for issue in verify_snapshot(snapshot)}
        self.assertIn(("unexpected", "unknown_field"), codes)
        self.assertIn(("nodes[0].evidence", "invalid_evidence"), codes)

    def test_shockscript_rejects_unknown_fields_and_nonfinite_numbers(self) -> None:
        scenario = demo_scenario()
        scenario["shocks"][0]["unexpected"] = "ignored-before-0.4"
        scenario["shocks"][0]["magnitude"] = float("nan")
        codes = {(issue.path, issue.code) for issue in validate_scenario(scenario)}
        self.assertIn(("shocks[0].unexpected", "unknown_field"), codes)
        self.assertIn(("shocks[0].magnitude", "invalid_magnitude"), codes)

    def test_invalid_engine_returns_a_structured_issue(self) -> None:
        scenario = copy.deepcopy(demo_scenario())
        scenario["propagation"]["engine"] = "unregistered_engine"
        issues = validate_scenario(scenario)
        self.assertIn(
            ("propagation.engine", "invalid_engine"),
            {(issue.path, issue.code) for issue in issues},
        )


if __name__ == "__main__":
    unittest.main()
