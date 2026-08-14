"""Analyze an existing NetworkX graph with explicit assumption boundaries."""

import networkx as nx

from cascadelens import analyze, default_scenario, graph_from_networkx

graph = nx.DiGraph()
graph.add_node("supplier", label="Supplier", kind="legal_entity", criticality=1.2)
graph.add_node("plant", label="Plant", kind="facility", criticality=1.5)
graph.add_node("market", label="Market", kind="region", criticality=1.0)
graph.add_edge("supplier", "plant", weight=0.72, lower=0.5, upper=0.86)
graph.add_edge("plant", "market", weight=0.61, lower=0.4, upper=0.78)

snapshot = graph_from_networkx(graph, decision_cutoff="2026-01-01T00:00:00Z")
result = analyze(snapshot, default_scenario(snapshot))

print(result.bounds["upper"]["totalWeightedImpact"])
