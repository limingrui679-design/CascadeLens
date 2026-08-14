import type { Metadata } from "next";
import { PageShell } from "../components/page-shell";
import { Eyebrow } from "../components/status";
import { workbenchCases } from "./case-data";
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
          Switch among all 12 reviewed cases or import JSON, CSV, GraphML, and a ShockScript. User topology remains unverified; every result remains scenario-only.
        </p>
      </section>
      <section className="wide-page-content">
        <Workbench
          cases={workbenchCases}
          initialSlug={typeof parameters.case === "string" ? parameters.case : undefined}
          initialMagnitude={finiteParameter(parameters.magnitude)}
          initialTransmission={finiteParameter(parameters.transmission)}
        />
      </section>
    </PageShell>
  );
}
