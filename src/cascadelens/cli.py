"""Dependency-light command line for installed Python users."""

from __future__ import annotations

import argparse
import os
import sys
import tempfile
from pathlib import Path
from typing import Any

from .analysis import analyze
from .canonical import stable_dumps
from .demo import demo_scenario, demo_snapshot
from .errors import CascadeLensValidationError, assert_no_errors
from .imports import load_graph
from .riskpack import create_riskpack, verify_riskpack
from .scenario import default_scenario, load_scenario, validate_against_snapshot, validate_scenario
from .validation import verify_snapshot
from .version import __version__


def _write_json(path: Path, value: Any, *, overwrite: bool = False) -> None:
    if path.is_symlink():
        raise ValueError(f"Refusing to write through a symbolic link: {path}")
    if path.exists():
        if not overwrite:
            raise FileExistsError(f"Output already exists: {path}")
        if not path.is_file():
            raise ValueError(f"Refusing to replace non-file output: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.tmp-", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(stable_dumps(value, indent=2) + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="cascadelens",
        description="Evidence-graded systemic-risk analysis in Python.",
        epilog=(
            "All generated impacts are scenarios. Recomputed verification is software evidence, "
            "not empirical accuracy, adoption, or realized impact."
        ),
    )
    parser.add_argument("--version", action="version", version=__version__)
    commands = parser.add_subparsers(dest="command", required=True)

    demo = commands.add_parser("demo", help="Create and verify a complete packaged demonstration")
    demo.add_argument("--out", type=Path, default=Path("cascadelens-demo-riskpack"))
    demo.add_argument("--overwrite", action="store_true")

    import_graph = commands.add_parser(
        "import-graph", help="Normalize CSV, JSON, or GraphML into WorldGraph"
    )
    import_graph.add_argument("input", type=Path)
    import_graph.add_argument("--out", type=Path, required=True)
    import_graph.add_argument("--decision-cutoff")
    import_graph.add_argument("--overwrite", action="store_true")

    validate = commands.add_parser("validate", help="Validate a graph and optional ShockScript")
    validate.add_argument("--graph", type=Path, required=True)
    validate.add_argument("--scenario", type=Path)

    run = commands.add_parser("run", help="Analyze a user graph with an optional ShockScript")
    run.add_argument("--graph", type=Path, required=True)
    run.add_argument("--scenario", type=Path)
    run.add_argument("--out", type=Path, required=True)
    run.add_argument("--overwrite", action="store_true")

    pack = commands.add_parser("pack", help="Create a recomputation-verifiable RiskPack")
    pack.add_argument("--graph", type=Path, required=True)
    pack.add_argument("--scenario", type=Path)
    pack.add_argument("--out", type=Path, required=True)
    pack.add_argument("--overwrite", action="store_true")

    verify = commands.add_parser("verify", help="Verify and recompute a RiskPack")
    verify.add_argument("riskpack", type=Path)
    verify.add_argument("--expected-digest")
    return parser


def _load_inputs(graph_path: Path, scenario_path: Path | None):
    snapshot = load_graph(graph_path)
    scenario = load_scenario(scenario_path) if scenario_path else default_scenario(snapshot)
    assert_no_errors("Invalid WorldGraph snapshot", verify_snapshot(snapshot))
    assert_no_errors("Invalid ShockScript", validate_scenario(scenario))
    assert_no_errors(
        "Scenario and snapshot are incompatible", validate_against_snapshot(scenario, snapshot)
    )
    return snapshot, scenario


def _execute(args: argparse.Namespace) -> int:
    if args.command == "demo":
        report = create_riskpack(
            demo_snapshot(),
            demo_scenario(),
            args.out,
            generated_at="2026-01-01T00:00:00Z",
            overwrite=args.overwrite,
        )
        verification = verify_riskpack(args.out, expected_digest=report["packDigest"])
        if not verification["valid"]:
            raise RuntimeError(f"Generated demo failed verification: {verification['issues']}")
        print(
            stable_dumps(
                {
                    "status": "verified_recomputed_scenario_only",
                    "riskpack": report["path"],
                    "packDigest": report["packDigest"],
                    "next": (
                        "Open results/cascade-bounds.json or run cascadelens verify <directory>."
                    ),
                },
                indent=2,
            )
        )
        return 0
    if args.command == "import-graph":
        snapshot = load_graph(args.input, decision_cutoff=args.decision_cutoff)
        _write_json(args.out, snapshot, overwrite=args.overwrite)
        node_count = len(snapshot["nodes"])
        edge_count = len(snapshot["edges"])
        print(f"WROTE WORLDGRAPH {args.out.resolve()} ({node_count} nodes / {edge_count} edges)")
        return 0
    if args.command == "validate":
        snapshot, scenario = _load_inputs(args.graph, args.scenario)
        print(f"VALID {snapshot['snapshotId']} + {scenario['scenarioId']}")
        return 0
    if args.command == "run":
        snapshot, scenario = _load_inputs(args.graph, args.scenario)
        result = analyze(snapshot, scenario)
        _write_json(
            args.out,
            {
                "status": "scenario_output_not_empirical_validation",
                "scenarioId": scenario["scenarioId"],
                "snapshotDigest": snapshot["contentDigest"],
                **result.as_dict(),
            },
            overwrite=args.overwrite,
        )
        print(f"WROTE ANALYSIS {args.out.resolve()}")
        return 0
    if args.command == "pack":
        snapshot, scenario = _load_inputs(args.graph, args.scenario)
        report = create_riskpack(snapshot, scenario, args.out, overwrite=args.overwrite)
        print(f"WROTE RECOMPUTED RISKPACK {report['path']} pack-digest={report['packDigest']}")
        return 0
    if args.command == "verify":
        report = verify_riskpack(args.riskpack, expected_digest=args.expected_digest)
        if not report["valid"]:
            print("INVALID " + ", ".join(report["issues"]), file=sys.stderr)
            return 1
        print(f"VERIFIED RECOMPUTED {args.riskpack.resolve()} pack-digest={report['packDigest']}")
        return 0
    raise RuntimeError(f"Unsupported command {args.command}")


def main(argv: list[str] | None = None) -> int:
    try:
        return _execute(_parser().parse_args(argv))
    except (
        CascadeLensValidationError,
        FileExistsError,
        OSError,
        RuntimeError,
        TypeError,
        ValueError,
    ) as error:
        print(f"ERROR {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
