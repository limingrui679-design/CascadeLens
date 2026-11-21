import unittest
from itertools import product

from cascadelens import replay_switching_costs


class SwitchingTests(unittest.TestCase):
    def test_oracle_matches_exhaustive_enumeration_and_online_choices_use_only_history(self):
        rows = [{"A": 0, "B": 1}, {"A": 2, "B": 0}, {"A": 0, "B": 3}, {"A": 1, "B": 0}]
        for cost in [0, 1, 3]:
            runs = replay_switching_costs(rows, cost)["policies"]
            expected = min(
                sum(row[x] for row, x in zip(rows[1:], path, strict=True))
                + cost * sum(x != y for x, y in zip(("A", *path[:-1]), path, strict=True))
                for path in product(("A", "B"), repeat=3)
            )
            self.assertEqual(runs["hindsight_path"]["total_loss"], expected)
            other = replay_switching_costs([*rows[:-1], {"A": 90, "B": -100}], cost)
            for name in ("follow_last", "cost_hurdle", "hold_initial"):
                self.assertEqual(runs[name]["choices"], other["policies"][name]["choices"])
        self.assertEqual(replay_switching_costs(rows, 3)["policies"]["cost_hurdle"]["switches"], 0)

    def test_incomplete_or_invalid_panels_are_rejected(self):
        for rows, cost in [
            ([{"a": 1}], 1),
            ([{}, {}], 0),
            ([{"a": 0}, {"b": 1}], 0),
            ([{"a": 0}, {"a": float("nan")}], 0),
            ([{"a": 0}] * 2, -1),
        ]:
            with self.assertRaises(ValueError):
                replay_switching_costs(rows, cost)
