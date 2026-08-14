"""Import an edge-list CSV and run a scenario-only stress."""

from pathlib import Path

from cascadelens import analyze, default_scenario, graph_from_csv

csv_text = Path("examples/data/simple_edges.csv").read_text(encoding="utf-8")
snapshot = graph_from_csv(csv_text, decision_cutoff="2026-01-01T00:00:00Z")
scenario = default_scenario(snapshot, magnitude=0.6)
result = analyze(snapshot, scenario)

print(f"{len(snapshot['nodes'])} nodes / {len(snapshot['edges'])} edges")
for bound in ("lower", "central", "upper"):
    print(bound, round(result.bounds[bound]["totalWeightedImpact"], 6))
