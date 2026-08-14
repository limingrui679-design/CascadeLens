"""Run the packaged demonstration through the public Python API."""

from cascadelens import analyze
from cascadelens.demo import demo_scenario, demo_snapshot

result = analyze(demo_snapshot(), demo_scenario())

print("benchmark:", result.benchmark["status"])
print("central impact:", round(result.bounds["central"]["totalWeightedImpact"], 6))
print("upper impact:", round(result.bounds["upper"]["totalWeightedImpact"], 6))
print("decision status:", result.interventions["recommendationStatus"])
