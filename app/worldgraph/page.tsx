import type { Metadata } from "next";
import snapshotJson from "@/content/cases/suez-route-restress/graph/snapshot.json";
import type { GraphSnapshot } from "../../packages/core/src/index";
import { PageShell } from "../components/page-shell";
import { Eyebrow, Status } from "../components/status";
import { GraphExplorer } from "./graph-explorer";

export const metadata: Metadata = {
  title: "WorldGraph explorer",
  description: "Inspect a bitemporal, evidence-graded CascadeLens graph snapshot.",
};

export default function WorldGraphPage() {
  return (
    <PageShell>
      <section className="page-intro compact-intro">
        <Eyebrow>Bitemporal evidence graph</Eyebrow>
        <h1>Every edge answers: known when, valid when, supported how?</h1>
        <p className="page-intro-copy">
          Select a node, hide inferred relations, and inspect the exact snapshot identity. Inferred links never silently become primary evidence.
        </p>
        <div className="page-intro-meta">
          <Status tone="inferred">assumed topology</Status>
          <Status tone="scenario">research stress</Status>
        </div>
      </section>
      <section className="wide-page-content">
        <GraphExplorer snapshot={snapshotJson as GraphSnapshot} />
      </section>
    </PageShell>
  );
}
