import type { Metadata } from "next";
import caseCatalog from "@/content/cases/catalog.json";
import { PageShell } from "../components/page-shell";
import { Eyebrow, Status } from "../components/status";
import { CaseLibrary, type CaseRecord } from "./case-library";

export const metadata: Metadata = {
  title: "Reference case library",
  description: "Twelve executable, auditable, scenario-only systemic-risk reference cases.",
};

export default function CasesPage() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>Reference case library</Eyebrow>
        <h1>Twelve complete pipelines. Zero inflated claims.</h1>
        <p className="page-intro-copy">
          Each case contains a sealed graph, ShockScript, assumption register, model card, bounded results, intervention analysis, observability output, benchmark status, and recomputation-verified RiskPack.
        </p>
        <div className="page-intro-meta">
          <Status tone="scenario">12 scenario-only</Status>
          <Status tone="blocked">0 historically scored</Status>
          <Status tone="inferred">assumed topologies</Status>
        </div>
      </section>
      <section className="page-content">
        <CaseLibrary cases={caseCatalog.cases as CaseRecord[]} />
      </section>
    </PageShell>
  );
}
