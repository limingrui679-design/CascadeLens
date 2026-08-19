import {
  runCascadeBounds,
  type GraphSnapshot,
  type ShockDefinition,
  type ShockScenario,
} from "../../packages/core/src/index";

export interface SensitivityCell {
  impact: number;
  severity: number;
  transmission: number;
}

export const sensitivityLevels = [0.1, 0.3, 0.5, 0.7, 0.9] as const;

function shockAtSeverity(shock: ShockDefinition, severity: number): ShockDefinition {
  switch (shock.operation) {
    case "multiply_capacity":
      return { ...shock, magnitude: 1 - severity };
    case "increase_demand":
      return { ...shock, magnitude: severity / (1 - severity) };
    case "disable":
      return {
        ...shock,
        operation: "multiply_capacity",
        magnitude: 1 - severity,
        unit: "share_remaining",
        rationale:
          `${shock.rationale} Sensitivity-only mapping: normalized severity is represented as partial capacity loss; the reviewed base run remains a binary disable.`,
      };
    case "add_cost":
    case "financial_stress":
    case "policy_restrict":
    case "reduce_supply":
      return { ...shock, magnitude: severity };
  }
}

export async function computeSensitivitySurface(
  snapshot: GraphSnapshot,
  scenario: ShockScenario,
): Promise<SensitivityCell[]> {
  return Promise.all(
    sensitivityLevels.flatMap((transmission) =>
      sensitivityLevels.map(async (severity) => {
        const gridScenario: ShockScenario = {
          ...scenario,
          shocks: scenario.shocks.map((shock, index) =>
            index === 0 ? shockAtSeverity(shock, severity) : shock,
          ),
          propagation: { ...scenario.propagation, transmission },
        };
        const bounds = await runCascadeBounds(snapshot, gridScenario);
        return {
          severity,
          transmission,
          impact: bounds.upper.totalWeightedImpact,
        };
      }),
    ),
  );
}
