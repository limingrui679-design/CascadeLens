import type { Metadata } from "next";
import connectorCatalog from "@/content/catalog/connectors.json";
import snapshotCatalog from "@/content/snapshots/catalog.json";
import { PageShell } from "../components/page-shell";
import { Eyebrow, Status } from "../components/status";

export const metadata: Metadata = {
  title: "Data and license catalog",
  description: "Eleven documented public-source connector contracts and four verified frozen official-source snapshots.",
};

function modeTone(mode: string) {
  return mode === "redistributable" ? "observed" : mode === "user_provided" ? "inferred" : "scenario";
}

export default function DataPage() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>Source acquisition registry</Eyebrow>
        <h1>Data access is a contract, not a scrape.</h1>
        <p className="page-intro-copy">
          Every connector declares its official source, allowed hosts, evidence grade, request limits, redistribution mode, and known interpretive boundary. Generic mappings preserve metric facts without inventing edges; a source-specific mapping must preserve an explicit published relation and its evidence limit.
        </p>
        <div className="page-intro-meta">
          <Status tone="observed">11 core connectors</Status>
          <Status tone="blocked">redirects blocked</Status>
          <Status tone="verified">4 frozen public snapshots</Status>
        </div>
      </section>
      <section className="page-content">
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">CascadeLens core data connectors</caption>
            <thead><tr><th>Source</th><th>Evidence</th><th>Acquisition</th><th>Boundary</th><th>Checked</th></tr></thead>
            <tbody>
              {connectorCatalog.connectors.map((item) => (
                <tr key={item.id}>
                  <td><a href={item.officialUri} rel="noreferrer" target="_blank">{item.name} ↗</a><br /><small>{item.publisher}</small></td>
                  <td><span className="mono">{item.evidenceGrade.toLowerCase()}</span></td>
                  <td><Status tone={modeTone(item.redistributionMode)}>{item.redistributionMode.replaceAll("_", " ")}</Status></td>
                  <td>{item.boundary}</td>
                  <td className="mono">{item.checkedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <article className="panel">
          <Eyebrow>Executed public-data evidence</Eyebrow>
          <h2>Four official-source routes are frozen and independently recheckable.</h2>
          <p>
            FAOSTAT, GLEIF, openFDA, and BEA contribute {snapshotCatalog.factCount.toLocaleString("en-US")} normalized facts with exact source hashes and deterministic graphs. The first three remain metric-only. BEA contributes {snapshotCatalog.dependencyEdgeCount} published sector-level input edges; all are model-inferred, upper-bound-only, and not firm-level dependencies.
          </p>
          <p>
            <a href="https://github.com/limingrui679-design/CascadeLens/tree/main/content/snapshots" rel="noreferrer" target="_blank">Inspect queries, payloads, attribution, and digests ↗</a>
          </p>
        </article>
        <div className="content-grid data-principles">
          <article className="panel"><h2>Redistributable</h2><p>Small lawful snapshots may be packaged only with dataset-specific attribution and metadata.</p></article>
          <article className="panel"><h2>Download on run</h2><p>The repository stores bounded queries, timestamps, manifests, and hashes—not a mirror of the provider dataset.</p></article>
          <article className="panel"><h2>User provided</h2><p>The user imports a lawful export. CascadeLens records its exact digest and never assumes redistribution rights.</p></article>
        </div>
      </section>
    </PageShell>
  );
}
