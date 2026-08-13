import type { Metadata } from "next";
import snapshotJson from "@/content/cases/semiconductor-capacity-restress/graph/snapshot.json";
import scenarioJson from "@/content/cases/semiconductor-capacity-restress/scenario.json";
import boundsJson from "@/content/cases/semiconductor-capacity-restress/results/cascade-bounds.json";
import interventionsJson from "@/content/cases/semiconductor-capacity-restress/results/interventions.json";
import type {
  CascadeBounds,
  GraphSnapshot,
  InterventionAnalysis,
  ShockScenario,
} from "../../packages/core/src/index";
import { PageShell } from "../components/page-shell";
import { Eyebrow } from "../components/status";
import { Workbench } from "./workbench";

export const metadata: Metadata = {
  title: "Scenario workbench",
  description: "Run a bounded CascadeLens stress scenario locally in the browser.",
};

function finiteParameter(value: string | string[] | undefined): number | undefined {
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function WorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  return (
    <PageShell>
      <section className="page-intro compact-intro">
        <Eyebrow>Interactive scenario compiler</Eyebrow>
        <h1>Change an assumption. See the decision boundary move.</h1>
        <p className="page-intro-copy">
          This browser run uses the same deterministic core as the CLI. Inputs remain an assumed topology; results remain scenario-only.
        </p>
      </section>
      <section className="wide-page-content">
        <Workbench
          initialBounds={boundsJson as CascadeBounds}
          initialInterventions={interventionsJson as InterventionAnalysis}
          initialMagnitude={finiteParameter(parameters.magnitude)}
          initialTransmission={finiteParameter(parameters.transmission)}
          scenario={scenarioJson as ShockScenario}
          snapshot={snapshotJson as GraphSnapshot}
        />
      </section>
    </PageShell>
  );
}
