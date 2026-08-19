import type { Metadata } from "next";
import caseCatalog from "@/content/cases/catalog.json";
import evidenceLedger from "@/content/validation/evidence-ledger.json";
import { PageShell } from "../components/page-shell";
import { Eyebrow, Status } from "../components/status";

export const metadata: Metadata = {
  title: "CascadeBench",
  description: "No-lookahead benchmark design and current honest validation status for CascadeLens.",
};

export default function BenchmarkPage() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>CascadeBench</Eyebrow>
        <h1>A benchmark is valid only if tomorrow never leaks into yesterday.</h1>
        <p className="page-intro-copy">
          CascadeBench freezes a decision cutoff, separates model inputs from post-event outcomes, and blocks scoring when temporal or source partitions fail.
        </p>
      </section>
      <section className="page-content">
        <div className="benchmark-scoreboard">
          <div><span>Reference cases</span><strong>{caseCatalog.caseCount}</strong></div>
          <div><span>Historically scored</span><strong>{evidenceLedger.counts.historical_replay}</strong></div>
          <div><span>External validations</span><strong>{evidenceLedger.counts.external_review}</strong></div>
          <div><span>Structured user studies</span><strong>{evidenceLedger.counts.structured_user_study}</strong></div>
          <div><span>Verified adoptions</span><strong>{evidenceLedger.counts.organizational_adoption}</strong></div>
          <div><span>Real-user impact studies</span><strong>{evidenceLedger.counts.real_world_impact}</strong></div>
        </div>
        <div className="benchmark-banner">
          <Status tone="blocked">empirical validation not yet established</Status>
          <p>
            The sixteen reference cases verify execution, structural diversity, decision framing, evidence governance, packaging, and tamper detection. They do not support a claim of predictive accuracy.
          </p>
        </div>
        <div className="content-grid metric-cards">
          {[
            ["Mean absolute error", "Magnitude agreement between central scenario impact and a comparable separated outcome proxy."],
            ["Spearman rank", "Whether node ordering agrees, without pretending that rank correlation establishes causal validity."],
            ["Interval coverage", "Share of separated outcome observations contained by the declared lower–upper envelope."],
            ["Coverage calibration", "Absolute gap between declared full-envelope coverage and empirical coverage, reported with mean interval width."],
            ["Direction accuracy", "Whether impact exceeds a frozen materiality threshold in both prediction and outcome."],
            ["Regret vs. zero baseline", "Excess absolute error over an explicit no-impact baseline; negative values mean the model improves on that baseline."],
            ["Leakage audit", "Input availability, observation time, source role, and outcome partition are checked before scoring."],
            ["Scenario-only fallback", "Used when outcomes are missing, incomparable, too few, or the case is explicitly synthetic."],
          ].map(([title, copy]) => <article className="panel" key={title}><h2>{title}</h2><p>{copy}</p></article>)}
        </div>
        <div className="prose validation-roadmap">
          <h2>What would legitimately move each zero?</h2>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>Evidence class</th><th>Minimum accepted record</th><th>What the repository can prepare</th><th>What cannot be self-awarded</th></tr>
              </thead>
              <tbody>
                <tr><td>Historical replay</td><td>Frozen pre-event inputs plus a separate, complete post-event outcome partition and preregistered metrics.</td><td>No-lookahead gates, outcome schema, scoring, failed-case retention, and RiskPack packaging.</td><td>A comparable outcome series that was not used to tune the case.</td></tr>
                <tr><td>External review</td><td>A named independent reviewer, scope, conflicts statement, findings, and dated public or archived record.</td><td>Review packet, method map, reproducible artifacts, and issue intake.</td><td>Independence, domain authority, or a favorable opinion.</td></tr>
                <tr><td>Structured user study</td><td>Consented participants, predefined tasks, success measures, raw observations, and limitations.</td><td>Runnable tasks, study protocol, intake form, and analysis template.</td><td>Real participants or their observed behavior.</td></tr>
                <tr><td>Organizational adoption</td><td>An identifiable organization, dated scope, actual users, workflow, and verification contact or retained record.</td><td>Deployment instructions, audit artifacts, and adoption record template.</td><td>A claim that a demo, clone, star, or site visit equals use.</td></tr>
                <tr><td>Real-world impact</td><td>A baseline, intervention, attributable outcome measure, time window, uncertainty, and adverse-effect check.</td><td>Impact protocol, metrics schema, and evidence-preserving report format.</td><td>Attribution, realized benefit, or counterfactual evidence without a real evaluation.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="prose benchmark-protocol">
          <h2>Minimum acceptable historical replay</h2>
          <ol>
            <li>Freeze a decision cutoff before inspecting the evaluation outcomes.</li>
            <li>Preserve exact input artifacts and prove they were available by the cutoff.</li>
            <li>Acquire outcomes through a distinct source role after the event.</li>
            <li>Predeclare comparable nodes, proxy definition, horizon, threshold, exclusions, and missing-data policy.</li>
            <li>Publish the full RiskPack and retain failed or blocked cases in the denominator.</li>
          </ol>
          <p>
            <a href="https://github.com/limingrui679-design/CascadeLens/tree/main/docs/validation" rel="noreferrer" target="_blank">Open the runnable replay, review, user-study, adoption, and impact protocols ↗</a>
          </p>
        </div>
      </section>
    </PageShell>
  );
}
