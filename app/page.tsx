import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Braces,
  DatabaseZap,
  GitBranch,
  FileUp,
  FlaskConical,
  HeartPulse,
  NotebookTabs,
  MapPinned,
  ChartNoAxesCombined,
  ScanSearch,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import caseCatalog from "@/content/cases/catalog.json";
import connectorCatalog from "@/content/catalog/connectors.json";
import { PageShell } from "./components/page-shell";
import { Eyebrow, Status } from "./components/status";

export const metadata: Metadata = {
  title: "Trace systemic risk without hiding uncertainty",
  description:
    "Compile evidence-graded world graphs, shocks, intervention choices, and provenance into recomputation-verifiable RiskPacks.",
};

const featured = caseCatalog.cases[0];
const decisionLenses = [
  {
    icon: HeartPulse,
    slug: "health-data-interoperability-stress",
    label: "Health information systems",
    action: "Trace terminology, provenance, review, and reporting failure paths.",
  },
  {
    icon: FlaskConical,
    slug: "behavioral-intervention-evidence-stress",
    label: "Behavioral evaluation",
    action: "Separate measurement, assignment, response, and rollout evidence.",
  },
  {
    icon: MapPinned,
    slug: "place-based-regeneration-equity-stress",
    label: "Place-based policy",
    action: "Make housing, access, transition costs, and affected groups visible.",
  },
  {
    icon: ChartNoAxesCombined,
    slug: "portfolio-concentration-fiduciary-stress",
    label: "Portfolio risk",
    action: "Compare concentration, liquidity, mandate, and beneficiary trade-offs.",
  },
].map((item) => ({
  ...item,
  case: caseCatalog.cases.find((candidate) => candidate.slug === item.slug)!,
}));

export default function Home() {
  return (
    <PageShell>
      <section className="hero section-grid">
        <div className="hero-copy">
          <Eyebrow>World graph → shock → decision evidence</Eyebrow>
          <h1>Trace how disruption becomes systemic risk.</h1>
          <p className="hero-lede">
            CascadeLens compiles facts, assumptions, missing links, and decisions into one auditable chain—then keeps each claim in its proper evidence class.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/workbench">
              Run a scenario <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className="button button-secondary" href="/methodology">
              Inspect the method
            </Link>
          </div>
          <dl className="hero-stats" aria-label="Verified repository scope">
            <div><dt>Core connectors</dt><dd>{connectorCatalog.connectors.length}</dd></div>
            <div><dt>Executable cases</dt><dd>{caseCatalog.caseCount}</dd></div>
            <div><dt>Historically scored</dt><dd>{caseCatalog.historicallyScoredCaseCount}</dd></div>
          </dl>
        </div>

        <article className="signal-card" aria-labelledby="featured-signal-title">
          <div className="signal-card-head">
            <div>
              <p className="micro-label">Verified build artifact</p>
              <h2 id="featured-signal-title">{featured.shortTitle}</h2>
            </div>
            <Status tone="scenario">scenario only</Status>
          </div>
          <div className="bound-grid">
            {(
              [
                ["Lower", featured.totalWeightedImpact.lower, "Known eligible graph"],
                ["Central", featured.totalWeightedImpact.central, "Verified eligible graph"],
                ["Upper", featured.totalWeightedImpact.upper, "Assumption envelope"],
              ] as const
            ).map(([label, value, note]) => (
              <div className="bound-cell" key={label}>
                <span>{label}</span>
                <strong>{value.toFixed(3)}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="signal-path" aria-label="Illustrative cascade path">
            <span>route</span><i aria-hidden="true" />
            <span>inputs</span><i aria-hidden="true" />
            <span>production</span><i aria-hidden="true" />
            <span>availability</span>
          </div>
          <div className="evidence-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Context citation only. Topology and numbers are declared assumptions; zero launch cases claim empirical scoring.
            </p>
          </div>
          <Link className="text-link" href={`/cases/${featured.slug}`}>
            Open the complete evidence trail <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </article>
      </section>

      <section className="section section-rule">
        <div className="section-heading split-heading">
          <div>
            <Eyebrow>Decision range</Eyebrow>
            <h2>One evidence contract across four very different decisions.</h2>
          </div>
          <p>
            The expanded library now tests data semantics, experimentation, place-based equity, and fiduciary constraints alongside operational resilience.
          </p>
        </div>
        <div className="case-lens-grid">
          {decisionLenses.map((item) => {
            const Icon = item.icon;
            return (
              <Link className="case-lens-card" href={`/cases/${item.slug}`} key={item.slug}>
                <Icon size={20} aria-hidden="true" />
                <span>{item.label}</span>
                <h3>{item.case.shortTitle}</h3>
                <p>{item.action}</p>
                <small>Open evidence trail →</small>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section python-onramp">
        <div className="python-onramp-copy">
          <Eyebrow>Python-first · one-line install</Eyebrow>
          <h2>Run your graph—not only the demo.</h2>
          <p>Import JSON, CSV, GraphML, or NetworkX. Generate bounded results and a recomputable RiskPack locally.</p>
          <div className="python-capabilities">
            <span><FileUp size={15} aria-hidden="true" /> Your data</span>
            <span><NotebookTabs size={15} aria-hidden="true" /> Jupyter</span>
            <span><ShieldCheck size={15} aria-hidden="true" /> Verified pack</span>
          </div>
        </div>
        <div className="install-card">
          <div><Terminal size={16} aria-hidden="true" /><span>Python 3.11+</span></div>
          <code>pip install &quot;cascadelens @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.6.0&quot;</code>
          <code>cascadelens demo --out demo-riskpack</code>
          <div className="install-links">
            <a href="https://github.com/limingrui679-design/CascadeLens/blob/main/docs/tutorials/02_bring_your_own_graph.md">Import your graph</a>
            <a href="https://github.com/limingrui679-design/CascadeLens/blob/main/examples/notebooks/bring_your_own_graph.ipynb">Open notebook</a>
          </div>
        </div>
      </section>

      <section className="section section-rule">
        <div className="section-heading split-heading">
          <div>
            <Eyebrow>One chain of custody</Eyebrow>
            <h2>From source boundary to reversible decision.</h2>
          </div>
          <p>
            The platform is designed to stop when evidence, licensing, temporal validity, or feasibility is insufficient.
          </p>
        </div>
        <div className="feature-grid">
          {[
            [DatabaseZap, "WorldGraph", "Bitemporal nodes, edges, sources, license modes, and content-addressed snapshots."],
            [Braces, "ShockScript", "A strict YAML/JSON contract for targets, operations, horizons, assumptions, and constraints."],
            [GitBranch, "Bounded cascade", "Lower, central, and upper propagation expose missing relationships instead of smoothing them away."],
            [ScanSearch, "Observability frontier", "Ranks which missing fact could change the decision—without asserting that the fact is true."],
            [ShieldCheck, "RiskPack", "Inputs, results, and checksums backed by deterministic derived-output recomputation."],
            [ArrowRight, "InterventionLab", "Activation-dated bundles, horizon-specific Pareto trade-offs, and evidence-required status."],
          ].map(([Icon, title, copy]) => {
            const FeatureIcon = Icon as typeof DatabaseZap;
            return (
              <article className="feature-card" key={title as string}>
                <FeatureIcon size={21} aria-hidden="true" />
                <h3>{title as string}</h3>
                <p>{copy as string}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section evidence-band">
        <div>
          <Eyebrow>Truthful by construction</Eyebrow>
          <h2>Five evidence grades. No silent promotion.</h2>
        </div>
        <div className="grade-list">
          <Status tone="observed">official observed</Status>
          <Status tone="verified">entity reported</Status>
          <Status tone="verified">third-party verified</Status>
          <Status tone="blocked">text extracted</Status>
          <Status tone="inferred">model inferred</Status>
        </div>
        <p>
          Extracted and inferred relations are barred from primary estimates. A context page cannot substitute for a preserved, hashed data artifact.
        </p>
      </section>

      <section className="section callout">
        <div>
          <Eyebrow>Reproduce the whole claim</Eyebrow>
          <h2>A screenshot can persuade. A RiskPack can be checked.</h2>
        </div>
        <div className="button-row">
          <Link className="button button-primary" href="/cases">Inspect all 16 cases</Link>
          <Link className="button button-secondary" href="/docs">Build from source</Link>
        </div>
      </section>
    </PageShell>
  );
}
