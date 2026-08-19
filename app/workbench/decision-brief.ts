import type {
  CascadeBounds,
  InterventionAnalysis,
  ShockScenario,
} from "../../packages/core/src/index";
import type { CaseDecisionProfile } from "../../packages/cases/src/index";

interface DecisionBriefInput {
  bounds: CascadeBounds;
  decisionProfile: CaseDecisionProfile;
  decisionQuestion: string;
  domain: string;
  interventions: InterventionAnalysis;
  scenario: ShockScenario;
  slug: string;
  snapshotDigest: string;
}

export interface DecisionBriefArtifact {
  filename: string;
  mediaType: "text/markdown;charset=utf-8";
  text: string;
}

function list(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function buildDecisionBrief(input: DecisionBriefInput): DecisionBriefArtifact {
  const recommended = input.interventions.recommendedBundleIds.length > 0
    ? input.interventions.recommendedBundleIds.map((id) => `\`${id}\``).join(" + ")
    : "No eligible bundle";
  const primaryShock = input.scenario.shocks[0];
  const text = `# Decision brief: ${input.scenario.title}

Status: **scenario_only**  
Decision gate: **${input.interventions.recommendationStatus}**  
Domain: **${input.domain}**

## Decision question

${input.decisionQuestion}

## Declared run

- Decision owner: ${input.decisionProfile.decisionOwner}
- Primary shock: ${primaryShock.label}
- Operation / magnitude: \`${primaryShock.operation}\` / \`${primaryShock.magnitude}\`
- Transmission assumption: \`${input.scenario.propagation.transmission}\`
- Horizons: ${input.scenario.propagation.horizonsDays.join(" / ")} days
- Snapshot digest: \`${input.snapshotDigest}\`

## Bounded result

| Bound | Dimensionless weighted stress |
|---|---:|
| Lower | ${input.bounds.lower.totalWeightedImpact.toFixed(6)} |
| Central | ${input.bounds.central.totalWeightedImpact.toFixed(6)} |
| Upper | ${input.bounds.upper.totalWeightedImpact.toFixed(6)} |

The lower-central-upper gap reflects evidence eligibility and missing-graph assumptions. It is not a statistical confidence interval.

## Feasible numerical result

- Lowest eligible bundle under the declared objective: ${recommended}
- Operational status remains \`${input.interventions.recommendationStatus}\` because intervention effects are assumptions.

## Stakeholders

${list(input.decisionProfile.stakeholders)}

## Capabilities and methods exercised

Capabilities: ${input.decisionProfile.capabilities.map((item) => `\`${item}\``).join(", ")}

${list(input.decisionProfile.methods)}

## User checks

${list(input.decisionProfile.userTasks)}

## Trade-offs

${list(input.decisionProfile.tradeoffs)}

## Guardrail

${input.decisionProfile.guardrail}

This artifact is a communication summary, not a RiskPack. Rebuild the case and verify its packaged inputs and analytical outputs before relying on any number. It is not a forecast, causal estimate, realized loss, operational recommendation, external validation, adoption record, or impact claim.
`;
  return {
    filename: `${input.slug}-decision-brief.md`,
    mediaType: "text/markdown;charset=utf-8",
    text,
  };
}

