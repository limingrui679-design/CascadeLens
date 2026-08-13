import type { Metadata } from "next";
import { PageShell } from "../components/page-shell";
import { Eyebrow, Status } from "../components/status";

export const metadata: Metadata = {
  title: "Methodology",
  description: "Evidence grades, temporal gates, bounded propagation, interventions, observability, and benchmark rules.",
};

export default function MethodologyPage() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>Methodology</Eyebrow>
        <h1>The model may be wrong. The evidence boundary must still be right.</h1>
        <p className="page-intro-copy">
          CascadeLens is a transparent stress compiler. It makes a deliberately narrow promise: preserve what was known, what was assumed, how a result was produced, and what would reverse a decision.
        </p>
      </section>
      <section className="page-content method-layout">
        <nav className="method-nav" aria-label="Method sections">
          {[
            ["Evidence", "#evidence"], ["Time", "#time"], ["Cascade", "#cascade"],
            ["Interventions", "#interventions"], ["Observability", "#observability"],
            ["Benchmark", "#benchmark"], ["RiskPack", "#riskpack"],
          ].map(([label, href]) => <a href={href} key={href}>{label}</a>)}
        </nav>
        <article className="prose method-prose">
          <section id="evidence"><Eyebrow>01 · Evidence</Eyebrow><h2>Grades control eligibility, not decoration.</h2><p>Official observations and entity reports enter the lower bound. Independently verified third-party records may enter the central bound. Text extraction and model inference remain bounded-only and cannot support the primary estimate.</p><div className="grade-list"><Status tone="observed">official observed</Status><Status tone="verified">entity reported</Status><Status tone="verified">third-party verified</Status><Status tone="blocked">text extracted</Status><Status tone="inferred">model inferred</Status></div></section>
          <section id="time"><Eyebrow>02 · Time</Eyebrow><h2>Valid time and knowledge time are separate.</h2><p>A fact can describe the past yet become available only later. WorldGraph records when a relationship was valid, when the exact source version became available, and when it was retrieved. Replays gate on availability at the frozen cutoff while allowing a later archival retrieval of that exact version.</p></section>
          <section id="cascade"><Eyebrow>03 · Cascade</Eyebrow><h2>Bounded daily propagation over a typed directed graph.</h2><p>The built-in engine refreshes valid and knowable graph visibility on every simulated day, activates and retires shocks from their declared intervals, and solves each day to a declared tolerance under a strict iteration cap. Results distinguish the time-weighted mean, within-horizon peak, and final-day impact. Flow-share sums above one are reported rather than silently normalized.</p><pre><code>impactₜ(v) = 1 − Π(1 − contributionᵢ,ₜ){"\n"}contributionᵢ,ₜ = impactₜ(u) × edge_weight × transmission</code></pre></section>
          <section id="interventions"><Eyebrow>04 · Interventions</Eyebrow><h2>Activation first, Pareto frontier second.</h2><p>Up to sixteen interventions are exhaustively enumerated. Budget, count, units, and mutual exclusion are checked before evaluation; work begins at the frozen decision cutoff and each feasible effect activates only at that cutoff plus its declared lead time. The product retains the do-nothing baseline and reports a separate cost–risk frontier and recommendation for every horizon.</p></section>
          <section id="observability"><Eyebrow>05 · Observability</Eyebrow><h2>Ask which missing fact could change the action.</h2><p>A candidate relation is evaluated across present and absent branches to estimate expected value of perfect information, probability of decision change, worst-case impact reduction, and decision-uncertainty reduction net of acquisition cost. The branch is counterfactual: CascadeLens does not relabel the candidate as verified evidence.</p></section>
          <section id="benchmark"><Eyebrow>06 · Benchmark</Eyebrow><h2>Outcomes live in a separate partition.</h2><p>Post-event observations cannot support graph inputs or shocks. Scoring requires a declared metric and horizon, a complete outcome window beginning with the first shock, availability only after that window closes, and an outcome-only source. With valid separated outcomes, the benchmark reports error, rank, direction, interval coverage and width, empirical coverage calibration error, and regret versus an explicit zero-impact baseline. With no comparable outcome—or for a synthetic stress—the result is explicitly scenario-only.</p></section>
          <section id="riskpack"><Eyebrow>07 · RiskPack</Eyebrow><h2>Recomputation is necessary and still not validation.</h2><p>A RiskPack holds the scenario, sealed graph, source manifest, assumptions, model card, all recomputation inputs, cascade bounds, intervention and observability outputs, benchmark status, limitations, rebuild command, and relative SHA-256 checksums. Verification deterministically recomputes every derived output. An external expected digest can detect a self-consistently repacked input, but neither mode proves predictive validity, publisher identity without that external receipt, or adoption.</p></section>
        </article>
      </section>
    </PageShell>
  );
}
