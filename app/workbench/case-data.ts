import workbenchCatalog from "@/content/cases/workbench.json";
import type {
  CascadeBounds,
  GraphSnapshot,
  InterventionAnalysis,
  ShockScenario,
} from "../../packages/core/src/index";
import type { CaseDecisionProfile } from "../../packages/cases/src/index";

export interface WorkbenchCase {
  bounds: CascadeBounds;
  decisionProfile: CaseDecisionProfile;
  decisionQuestion: string;
  domain: string;
  interventions: InterventionAnalysis;
  scenario: ShockScenario;
  slug: string;
  snapshot: GraphSnapshot;
}

export const workbenchCases = workbenchCatalog.cases as WorkbenchCase[];
