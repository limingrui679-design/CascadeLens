"""Checksummed Python RiskPack creation and deterministic verification."""

from __future__ import annotations

import json
import os
import re
import shutil
import tempfile
from datetime import UTC, datetime
from pathlib import Path, PurePosixPath
from typing import Any

from .analysis import analyze
from .canonical import sha256_bytes, sha256_text, stable_dumps
from .errors import assert_no_errors
from .scenario import validate_against_snapshot, validate_scenario
from .temporal import is_datetime, isoformat
from .validation import verify_snapshot
from .version import ENGINE_VERSION, RISKPACK_SCHEMA_VERSION, __version__

_SAFE_PATH = re.compile(r"^[A-Za-z0-9._/-]+$")
_SHA256 = re.compile(r"^[a-f0-9]{64}$")
_MAX_FILE_BYTES = 100_000_000
_MAX_PACK_BYTES = 250_000_000
_MAX_PACK_FILES = 64
_DISCLAIMER = (
    "Deterministic recomputation is software evidence, not empirical accuracy, "
    "adoption, or realized impact."
)
_REQUIRED = {
    "README.md",
    "graph/snapshot.json",
    "scenario.json",
    "results/cascade-bounds.json",
    "results/interventions.json",
    "results/benchmark.json",
    "limitations.json",
}
_PACK_FILES = _REQUIRED | {"manifest.json", "checksums.sha256"}
_PACK_DIRECTORIES = {"graph", "results"}


def _json(value: Any) -> str:
    return stable_dumps(value, indent=2) + "\n"


def _checksum_text(checksums: dict[str, str]) -> str:
    return "".join(
        f"{checksums[path]}  {path}\n"
        for path in sorted(checksums, key=lambda item: item.encode("utf-8"))
    )


def _safe(path: str) -> bool:
    pure = PurePosixPath(path)
    return bool(_SAFE_PATH.fullmatch(path)) and not pure.is_absolute() and ".." not in pure.parts


def _pack_digest(files: dict[str, str]) -> str:
    return sha256_text(files["checksums.sha256"])


def _inventory(root: Path) -> tuple[set[str], list[str]]:
    files: set[str] = set()
    issues: list[str] = []
    total_bytes = 0
    resolved_root = root.resolve()
    for current, directories, filenames in os.walk(resolved_root, followlinks=False):
        current_path = Path(current)
        for name in directories:
            directory = current_path / name
            relative = directory.relative_to(resolved_root).as_posix()
            if directory.is_symlink():
                issues.append(f"symlink_entry:{relative}")
            elif relative not in _PACK_DIRECTORIES:
                issues.append(f"unexpected_directory:{relative}")
        for name in filenames:
            file_path = current_path / name
            relative = file_path.relative_to(resolved_root).as_posix()
            if not _safe(relative):
                issues.append(f"unsafe_pack_path:{relative}")
                continue
            if file_path.is_symlink() or not file_path.is_file():
                issues.append(f"non_regular_file:{relative}")
                continue
            files.add(relative)
            total_bytes += file_path.stat().st_size
            if len(files) > _MAX_PACK_FILES:
                issues.append("pack_file_count_exceeded")
                return files, issues
            if total_bytes > _MAX_PACK_BYTES:
                issues.append("pack_total_size_exceeded")
                return files, issues
    return files, issues


def _read_text(root: Path, relative: str) -> str:
    if not _safe(relative):
        raise ValueError(f"Unsafe RiskPack path: {relative}")
    target = root.joinpath(*PurePosixPath(relative).parts)
    if target.is_symlink() or not target.is_file():
        raise ValueError(f"RiskPack file is missing or not regular: {relative}")
    if target.stat().st_size > _MAX_FILE_BYTES:
        raise ValueError(f"RiskPack file exceeds safety limit: {relative}")
    resolved_root = root.resolve()
    resolved = target.resolve()
    if resolved_root != resolved and resolved_root not in resolved.parents:
        raise ValueError(f"RiskPack path escapes root: {relative}")
    return target.read_text(encoding="utf-8")


def create_riskpack(
    snapshot: dict[str, Any],
    scenario: dict[str, Any],
    output: str | Path,
    *,
    generated_at: str | None = None,
    overwrite: bool = False,
) -> dict[str, Any]:
    """Analyze inputs and atomically write a self-verifying RiskPack directory."""

    assert_no_errors("Invalid WorldGraph snapshot", verify_snapshot(snapshot))
    assert_no_errors("Invalid ShockScript", validate_scenario(scenario))
    assert_no_errors(
        "Scenario and snapshot are incompatible", validate_against_snapshot(scenario, snapshot)
    )
    result = analyze(snapshot, scenario)
    generated = generated_at or isoformat(datetime.now(UTC).replace(microsecond=0))
    if not is_datetime(generated):
        raise ValueError("generated_at must be an ISO-8601 date-time with timezone")
    limitations = {
        "status": "scenario_only"
        if result.benchmark["status"] == "scenario_only"
        else result.benchmark["status"],
        "statements": scenario["limitations"],
        "disclaimer": _DISCLAIMER,
    }
    files: dict[str, str] = {
        "README.md": (
            "# CascadeLens RiskPack\n\n"
            "This pack preserves a WorldGraph, ShockScript, bounded outputs, and checksums.\n\n"
            "Verification recomputes analytical outputs. It does not establish empirical accuracy, "
            "publisher identity, external review, adoption, or realized impact.\n"
        ),
        "graph/snapshot.json": _json(snapshot),
        "scenario.json": _json(scenario),
        "results/cascade-bounds.json": _json(result.bounds),
        "results/interventions.json": _json(result.interventions),
        "results/benchmark.json": _json(result.benchmark),
        "limitations.json": _json(limitations),
    }
    manifest = {
        "schemaVersion": RISKPACK_SCHEMA_VERSION,
        "packageVersion": __version__,
        "engineVersion": ENGINE_VERSION,
        "packId": f"riskpack:{scenario['scenarioId']}:python",
        "scenarioId": scenario["scenarioId"],
        "classification": scenario["classification"],
        "generatedAt": generated,
        "snapshotDigest": snapshot["contentDigest"],
        "verificationMode": "recomputed",
        "files": sorted(files, key=lambda item: item.encode("utf-8")),
        "truthfulStatus": {
            "benchmark": result.benchmark["status"],
            "externalValidation": "not_claimed",
            "organizationalAdoption": "not_claimed",
            "realizedImpact": "not_claimed",
        },
    }
    files["manifest.json"] = _json(manifest)
    checksums = {
        path: sha256_text(content)
        for path, content in sorted(files.items(), key=lambda item: item[0].encode("utf-8"))
    }
    files["checksums.sha256"] = _checksum_text(checksums)
    target = Path(output)
    if target.is_symlink():
        raise ValueError(f"Refusing to replace symbolic-link output: {target}")
    if target.exists():
        if not overwrite:
            raise FileExistsError(f"Output already exists: {target}")
        if not target.is_dir():
            raise ValueError(f"Refusing to replace non-directory output: {target}")
        existing = verify_riskpack(target)
        if not existing["valid"]:
            raise ValueError(
                f"Refusing to replace a directory that is not a valid current RiskPack: {target}"
            )
        shutil.rmtree(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=f".{target.name}.tmp-", dir=target.parent))
    try:
        for relative, content in files.items():
            path = temporary.joinpath(*PurePosixPath(relative).parts)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content, encoding="utf-8", newline="\n")
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
    return {
        "path": str(target.resolve()),
        "manifest": manifest,
        "packDigest": _pack_digest(files),
        "checksums": checksums,
    }


def verify_riskpack(path: str | Path, *, expected_digest: str | None = None) -> dict[str, Any]:
    """Verify checksums, contracts, and recomputed derived outputs."""

    root = Path(path)
    issues: list[str] = []
    if root.is_symlink() or not root.is_dir():
        return {"valid": False, "issues": ["invalid_pack_directory"], "packDigest": None}
    observed_files, inventory_issues = _inventory(root)
    issues.extend(inventory_issues)
    if observed_files != _PACK_FILES:
        issues.append("pack_file_set_mismatch")
    try:
        manifest_text = _read_text(root, "manifest.json")
        checksums_text = _read_text(root, "checksums.sha256")
        manifest = json.loads(manifest_text)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        return {"valid": False, "issues": [f"invalid_pack_structure:{error}"], "packDigest": None}
    declared = manifest.get("files")
    if not isinstance(declared, list) or not all(
        isinstance(item, str) and _safe(item) for item in declared
    ):
        return {"valid": False, "issues": ["invalid_manifest_files"], "packDigest": None}
    if len(declared) != len(set(declared)):
        issues.append("duplicate_manifest_files")
    if set(declared) != _REQUIRED:
        issues.append("required_file_set_mismatch")
    if declared != sorted(_REQUIRED, key=lambda item: item.encode("utf-8")):
        issues.append("manifest_files_not_canonical")
    checksums: dict[str, str] = {}
    for index, line in enumerate(checksums_text.splitlines(), start=1):
        if not line:
            continue
        match = re.fullmatch(r"([a-f0-9]{64})  ([A-Za-z0-9._/-]+)", line)
        if not match or not _safe(match.group(2)):
            issues.append(f"invalid_checksum_line:{index}")
            continue
        if match.group(2) in checksums:
            issues.append(f"duplicate_checksum:{match.group(2)}")
        checksums[match.group(2)] = match.group(1)
    expected_files = set(declared) | {"manifest.json"}
    if set(checksums) != expected_files:
        issues.append("checksum_file_set_mismatch")
    texts: dict[str, str] = {}
    for relative in expected_files:
        try:
            text = _read_text(root, relative)
        except (OSError, ValueError) as error:
            issues.append(f"file_error:{relative}:{error}")
            continue
        texts[relative] = text
        if checksums.get(relative) != sha256_text(text):
            issues.append(f"checksum_mismatch:{relative}")
    pack_digest = sha256_bytes(checksums_text.encode("utf-8"))
    if expected_digest is not None:
        if not _SHA256.fullmatch(expected_digest):
            issues.append("invalid_expected_digest")
        elif expected_digest != pack_digest:
            issues.append("external_digest_mismatch")
    try:
        snapshot = json.loads(texts["graph/snapshot.json"])
        scenario = json.loads(texts["scenario.json"])
        stored_bounds = json.loads(texts["results/cascade-bounds.json"])
        stored_interventions = json.loads(texts["results/interventions.json"])
        stored_benchmark = json.loads(texts["results/benchmark.json"])
        stored_limitations = json.loads(texts["limitations.json"])
        assert_no_errors("Invalid WorldGraph snapshot", verify_snapshot(snapshot))
        assert_no_errors("Invalid ShockScript", validate_scenario(scenario))
        recomputed = analyze(snapshot, scenario)
        for label, stored, actual in (
            ("bounds", stored_bounds, recomputed.bounds),
            ("interventions", stored_interventions, recomputed.interventions),
            ("benchmark", stored_benchmark, recomputed.benchmark),
        ):
            if stable_dumps(stored) != stable_dumps(actual):
                issues.append(f"derived_output_mismatch:{label}")
        if manifest.get("snapshotDigest") != snapshot.get("contentDigest"):
            issues.append("snapshot_digest_mismatch")
        if manifest.get("scenarioId") != scenario.get("scenarioId"):
            issues.append("scenario_id_mismatch")
        if manifest.get("verificationMode") != "recomputed":
            issues.append("verification_mode_mismatch")
        expected_manifest_fields = {
            "schemaVersion",
            "packageVersion",
            "engineVersion",
            "packId",
            "scenarioId",
            "classification",
            "generatedAt",
            "snapshotDigest",
            "verificationMode",
            "files",
            "truthfulStatus",
        }
        if set(manifest) != expected_manifest_fields:
            issues.append("manifest_field_set_mismatch")
        if manifest.get("schemaVersion") != RISKPACK_SCHEMA_VERSION:
            issues.append("riskpack_schema_version_mismatch")
        if manifest.get("packageVersion") != __version__:
            issues.append("package_version_mismatch")
        if manifest.get("engineVersion") != ENGINE_VERSION:
            issues.append("engine_version_mismatch")
        if manifest.get("packId") != f"riskpack:{scenario['scenarioId']}:python":
            issues.append("pack_id_mismatch")
        if manifest.get("classification") != scenario.get("classification"):
            issues.append("classification_mismatch")
        if not is_datetime(manifest.get("generatedAt")):
            issues.append("generated_at_invalid")
        expected_truthful_status = {
            "benchmark": recomputed.benchmark["status"],
            "externalValidation": "not_claimed",
            "organizationalAdoption": "not_claimed",
            "realizedImpact": "not_claimed",
        }
        if manifest.get("truthfulStatus") != expected_truthful_status:
            issues.append("truthful_status_mismatch")
        expected_limitations = {
            "status": recomputed.benchmark["status"],
            "statements": scenario["limitations"],
            "disclaimer": _DISCLAIMER,
        }
        if stored_limitations != expected_limitations:
            issues.append("limitations_mismatch")
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        issues.append(f"recomputation_error:{error}")
    return {
        "valid": not issues,
        "issues": sorted(set(issues)),
        "packDigest": pack_digest,
        "manifest": manifest,
    }
