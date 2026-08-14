from __future__ import annotations

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from cascadelens.demo import demo_scenario, demo_snapshot
from cascadelens.riskpack import create_riskpack, verify_riskpack


def _rehash(output: Path, relative: str) -> None:
    checksums = {}
    for line in (output / "checksums.sha256").read_text(encoding="utf-8").splitlines():
        digest, path = line.split("  ", 1)
        checksums[path] = digest
    checksums[relative] = hashlib.sha256((output / relative).read_bytes()).hexdigest()
    (output / "checksums.sha256").write_text(
        "".join(f"{checksums[path]}  {path}\n" for path in sorted(checksums)),
        encoding="utf-8",
    )


class RiskPackTests(unittest.TestCase):
    def test_create_and_recompute(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "pack"
            created = create_riskpack(
                demo_snapshot(),
                demo_scenario(),
                output,
                generated_at="2026-01-01T00:00:00Z",
            )
            report = verify_riskpack(output, expected_digest=created["packDigest"])
            self.assertTrue(report["valid"], report["issues"])
            self.assertEqual("scenario_only", report["manifest"]["truthfulStatus"]["benchmark"])

    def test_self_consistently_rehashed_tampering_still_fails_recomputation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "pack"
            create_riskpack(demo_snapshot(), demo_scenario(), output)
            bounds_path = output / "results/cascade-bounds.json"
            bounds = json.loads(bounds_path.read_text(encoding="utf-8"))
            bounds["upper"]["totalWeightedImpact"] = 0.000001
            bounds_path.write_text(json.dumps(bounds, indent=2) + "\n", encoding="utf-8")
            _rehash(output, "results/cascade-bounds.json")
            report = verify_riskpack(output)
            self.assertFalse(report["valid"])
            self.assertIn("derived_output_mismatch:bounds", report["issues"])

    def test_rejects_undeclared_extra_file(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "pack"
            create_riskpack(demo_snapshot(), demo_scenario(), output)
            (output / "unexpected.txt").write_text("not declared\n", encoding="utf-8")
            report = verify_riskpack(output)
            self.assertFalse(report["valid"])
            self.assertIn("pack_file_set_mismatch", report["issues"])

    def test_rejects_self_rehashed_truth_boundary_tampering(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "pack"
            create_riskpack(demo_snapshot(), demo_scenario(), output)
            manifest_path = output / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["truthfulStatus"]["externalValidation"] = "verified"
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
            _rehash(output, "manifest.json")
            report = verify_riskpack(output)
            self.assertFalse(report["valid"])
            self.assertIn("truthful_status_mismatch", report["issues"])

    def test_overwrite_replaces_only_a_verified_current_pack(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            output = root / "pack"
            output.mkdir()
            sentinel = output / "keep.txt"
            sentinel.write_text("unrelated\n", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "not a valid current RiskPack"):
                create_riskpack(demo_snapshot(), demo_scenario(), output, overwrite=True)
            self.assertEqual("unrelated\n", sentinel.read_text(encoding="utf-8"))

            sentinel.unlink()
            output.rmdir()
            create_riskpack(demo_snapshot(), demo_scenario(), output)
            create_riskpack(demo_snapshot(), demo_scenario(), output, overwrite=True)
            self.assertTrue(verify_riskpack(output)["valid"])

    def test_rejects_self_rehashed_invalid_generated_timestamp(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary) / "pack"
            create_riskpack(demo_snapshot(), demo_scenario(), output)
            manifest_path = output / "manifest.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["generatedAt"] = "not-a-time"
            manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
            _rehash(output, "manifest.json")
            report = verify_riskpack(output)
            self.assertFalse(report["valid"])
            self.assertIn("generated_at_invalid", report["issues"])


if __name__ == "__main__":
    unittest.main()
