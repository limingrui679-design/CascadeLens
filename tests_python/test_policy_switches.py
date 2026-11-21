import unittest
from itertools import product

from cascadelens.interventions import _pareto, policy_switches


class PolicyValueTests(unittest.TestCase):
    def test_only_globally_supported_bundles_switch(self):
        options = [
            {"cost": cost, "worstCaseImpact": impact, "interventionIds": [name], "feasible": True}
            for name, cost, impact in [
                ("none", 0, 10),
                ("mid", 6, 8),
                ("last", 10, 0),
                ("tie", 10, 0),
            ]
        ]
        frontier = _pareto(options)
        self.assertEqual(len(frontier), 4)
        switches = policy_switches(frontier)
        self.assertEqual(
            [(s["fromBundleIds"], s["toBundleIds"], s["threshold"]) for s in switches],
            [(["none"], ["last"], 1)],
        )

    def test_sorted_scan_matches_direct_dominance(self):
        options = [
            {"cost": a, "worstCaseImpact": b, "interventionIds": [i], "feasible": i != 2}
            for i, (a, b) in enumerate(product(range(4), range(3)))
        ]
        for start in range(len(options)):
            sample = options[start:]
            expected = [
                p
                for p in sample
                if p["feasible"]
                and not any(
                    q["feasible"]
                    and q["cost"] <= p["cost"]
                    and q["worstCaseImpact"] <= p["worstCaseImpact"]
                    and (q["cost"], q["worstCaseImpact"]) != (p["cost"], p["worstCaseImpact"])
                    for q in sample
                )
            ]
            self.assertEqual(_pareto(sample), expected)
