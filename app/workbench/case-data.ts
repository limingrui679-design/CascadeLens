import type {
  CascadeBounds,
  GraphSnapshot,
  InterventionAnalysis,
  ShockScenario,
} from "../../packages/core/src/index";

import baltimoreBounds from "@/content/cases/baltimore-port-restress/results/cascade-bounds.json";
import baltimoreGraph from "@/content/cases/baltimore-port-restress/graph/snapshot.json";
import baltimoreInterventions from "@/content/cases/baltimore-port-restress/results/interventions.json";
import baltimoreScenario from "@/content/cases/baltimore-port-restress/scenario.json";
import criticalBounds from "@/content/cases/critical-minerals-export-stress/results/cascade-bounds.json";
import criticalGraph from "@/content/cases/critical-minerals-export-stress/graph/snapshot.json";
import criticalInterventions from "@/content/cases/critical-minerals-export-stress/results/interventions.json";
import criticalScenario from "@/content/cases/critical-minerals-export-stress/scenario.json";
import drugBounds from "@/content/cases/drug-shortage-restress/results/cascade-bounds.json";
import drugGraph from "@/content/cases/drug-shortage-restress/graph/snapshot.json";
import drugInterventions from "@/content/cases/drug-shortage-restress/results/interventions.json";
import drugScenario from "@/content/cases/drug-shortage-restress/scenario.json";
import foodBounds from "@/content/cases/food-export-compound-stress/results/cascade-bounds.json";
import foodGraph from "@/content/cases/food-export-compound-stress/graph/snapshot.json";
import foodInterventions from "@/content/cases/food-export-compound-stress/results/interventions.json";
import foodScenario from "@/content/cases/food-export-compound-stress/scenario.json";
import ofacBounds from "@/content/cases/ofac-list-change-stress/results/cascade-bounds.json";
import ofacGraph from "@/content/cases/ofac-list-change-stress/graph/snapshot.json";
import ofacInterventions from "@/content/cases/ofac-list-change-stress/results/interventions.json";
import ofacScenario from "@/content/cases/ofac-list-change-stress/scenario.json";
import panamaBounds from "@/content/cases/panama-drought-restress/results/cascade-bounds.json";
import panamaGraph from "@/content/cases/panama-drought-restress/graph/snapshot.json";
import panamaInterventions from "@/content/cases/panama-drought-restress/results/interventions.json";
import panamaScenario from "@/content/cases/panama-drought-restress/scenario.json";
import ppeBounds from "@/content/cases/medical-ppe-demand-restress/results/cascade-bounds.json";
import ppeGraph from "@/content/cases/medical-ppe-demand-restress/graph/snapshot.json";
import ppeInterventions from "@/content/cases/medical-ppe-demand-restress/results/interventions.json";
import ppeScenario from "@/content/cases/medical-ppe-demand-restress/scenario.json";
import redSeaBounds from "@/content/cases/red-sea-rerouting-restress/results/cascade-bounds.json";
import redSeaGraph from "@/content/cases/red-sea-rerouting-restress/graph/snapshot.json";
import redSeaInterventions from "@/content/cases/red-sea-rerouting-restress/results/interventions.json";
import redSeaScenario from "@/content/cases/red-sea-rerouting-restress/scenario.json";
import refiningBounds from "@/content/cases/refining-hurricane-restress/results/cascade-bounds.json";
import refiningGraph from "@/content/cases/refining-hurricane-restress/graph/snapshot.json";
import refiningInterventions from "@/content/cases/refining-hurricane-restress/results/interventions.json";
import refiningScenario from "@/content/cases/refining-hurricane-restress/scenario.json";
import semiconductorBounds from "@/content/cases/semiconductor-capacity-restress/results/cascade-bounds.json";
import semiconductorGraph from "@/content/cases/semiconductor-capacity-restress/graph/snapshot.json";
import semiconductorInterventions from "@/content/cases/semiconductor-capacity-restress/results/interventions.json";
import semiconductorScenario from "@/content/cases/semiconductor-capacity-restress/scenario.json";
import suezBounds from "@/content/cases/suez-route-restress/results/cascade-bounds.json";
import suezGraph from "@/content/cases/suez-route-restress/graph/snapshot.json";
import suezInterventions from "@/content/cases/suez-route-restress/results/interventions.json";
import suezScenario from "@/content/cases/suez-route-restress/scenario.json";
import ukraineBounds from "@/content/cases/ukraine-commodity-compound-restress/results/cascade-bounds.json";
import ukraineGraph from "@/content/cases/ukraine-commodity-compound-restress/graph/snapshot.json";
import ukraineInterventions from "@/content/cases/ukraine-commodity-compound-restress/results/interventions.json";
import ukraineScenario from "@/content/cases/ukraine-commodity-compound-restress/scenario.json";

export interface WorkbenchCase {
  bounds: CascadeBounds;
  interventions: InterventionAnalysis;
  scenario: ShockScenario;
  slug: string;
  snapshot: GraphSnapshot;
}

function entry(
  slug: string,
  snapshot: unknown,
  scenario: unknown,
  bounds: unknown,
  interventions: unknown,
): WorkbenchCase {
  return {
    slug,
    snapshot: snapshot as GraphSnapshot,
    scenario: scenario as ShockScenario,
    bounds: bounds as CascadeBounds,
    interventions: interventions as InterventionAnalysis,
  };
}

export const workbenchCases: WorkbenchCase[] = [
  entry("suez-route-restress", suezGraph, suezScenario, suezBounds, suezInterventions),
  entry("semiconductor-capacity-restress", semiconductorGraph, semiconductorScenario, semiconductorBounds, semiconductorInterventions),
  entry("medical-ppe-demand-restress", ppeGraph, ppeScenario, ppeBounds, ppeInterventions),
  entry("ukraine-commodity-compound-restress", ukraineGraph, ukraineScenario, ukraineBounds, ukraineInterventions),
  entry("panama-drought-restress", panamaGraph, panamaScenario, panamaBounds, panamaInterventions),
  entry("red-sea-rerouting-restress", redSeaGraph, redSeaScenario, redSeaBounds, redSeaInterventions),
  entry("baltimore-port-restress", baltimoreGraph, baltimoreScenario, baltimoreBounds, baltimoreInterventions),
  entry("refining-hurricane-restress", refiningGraph, refiningScenario, refiningBounds, refiningInterventions),
  entry("critical-minerals-export-stress", criticalGraph, criticalScenario, criticalBounds, criticalInterventions),
  entry("ofac-list-change-stress", ofacGraph, ofacScenario, ofacBounds, ofacInterventions),
  entry("drug-shortage-restress", drugGraph, drugScenario, drugBounds, drugInterventions),
  entry("food-export-compound-stress", foodGraph, foodScenario, foodBounds, foodInterventions),
];

