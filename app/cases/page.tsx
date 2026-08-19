import type { Metadata } from "next";
import caseCatalog from "@/content/cases/catalog.json";
import { PageShell } from "../components/page-shell";
import { Eyebrow, Status } from "../components/status";
import { CaseLibrary, type CaseRecord } from "./case-library";
import { CapabilityMatrix } from "./capability-matrix";

export const metadata: Metadata = {
  title: "Reference case library",
  description: "Sixteen executable, auditable, scenario-only decision and systemic-risk reference cases.",
};

export default function CasesPage() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>Reference case library</Eyebrow>
        <h1>Sixteen complete pipelines. One visible evidence boundary.</h1>
        <p className="page-intro-copy">
          Each case contains a sealed graph, ShockScript, assumption register, model card, bounded results, intervention analysis, observability output, benchmark status, and recomputation-verified RiskPack.
        </p>
        <div className="page-intro-meta">
          <Status tone="scenario">16 scenario-only</Status>
          <Status tone="blocked">0 historically scored</Status>
          <Status tone="inferred">assumed topologies</Status>
        </div>
      </section>
      <section className="page-content">
        <div className="section-heading capability-heading">
          <div>
            <Eyebrow>Capability coverage</Eyebrow>
            <h2>Compare what each case actually makes you do.</h2>
          </div>
          <p>
            The matrix distinguishes analytical, engineering, decision, and domain tasks. Every cell is backed by a case profile, generated artifact, and Workbench path.
          </p>
        </div>
        <CapabilityMatrix />
        <CaseLibrary cases={caseCatalog.cases as CaseRecord[]} />
      </section>
    </PageShell>
  );
}
