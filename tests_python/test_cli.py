from __future__ import annotations

import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


class CliTests(unittest.TestCase):
    def test_demo_and_verify(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "demo"
            demo = subprocess.run(
                [sys.executable, "-m", "cascadelens", "demo", "--out", str(output)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(0, demo.returncode, demo.stderr)
            self.assertIn("verified_recomputed_scenario_only", demo.stdout)
            verify = subprocess.run(
                [sys.executable, "-m", "cascadelens", "verify", str(output)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(0, verify.returncode, verify.stderr)
            self.assertIn("VERIFIED RECOMPUTED", verify.stdout)

    def test_json_output_refuses_to_follow_a_symbolic_link(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            graph = root / "graph.csv"
            graph.write_text("source,target,weight\nA,B,0.5\n", encoding="utf-8")
            sentinel = root / "sentinel.json"
            sentinel.write_text('{"preserve":true}\n', encoding="utf-8")
            output = root / "output.json"
            output.symlink_to(sentinel)
            command = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "cascadelens",
                    "import-graph",
                    str(graph),
                    "--out",
                    str(output),
                    "--overwrite",
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(1, command.returncode)
            self.assertIn("symbolic link", command.stderr)
            self.assertEqual('{"preserve":true}\n', sentinel.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
