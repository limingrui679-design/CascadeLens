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
          <div><span>Real-user impact studies</span><strong>{evidenceLedger.counts.real_world_impact}</strong></div>
        </div>
        <div className="benchmark-banner">
          <Status tone="blocked">empirical validation not yet established</Status>
          <p>
            The twelve launch cases verify execution, invariants, evidence governance, packaging, and tamper detection. They do not support a claim of predictive accuracy.
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
