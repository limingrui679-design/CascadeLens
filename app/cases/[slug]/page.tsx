import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import caseCatalog from "@/content/cases/catalog.json";
import { PageShell } from "../../components/page-shell";
import { Eyebrow, Status } from "../../components/status";

type CaseRecord = (typeof caseCatalog.cases)[number];

export function generateStaticParams() {
  return caseCatalog.cases.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = caseCatalog.cases.find((candidate) => candidate.slug === slug);
  return item
    ? {
        title: item.title,
        description: item.summary,
        openGraph: {
          title: item.title,
          description: item.summary,
          images: [],
        },
        twitter: {
          card: "summary",
          title: item.title,
          description: item.summary,
          images: [],
        },
      }
    : { title: "Case not found" };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = caseCatalog.cases.find((candidate) => candidate.slug === slug) as CaseRecord | undefined;
  if (!item) notFound();
  return (
    <PageShell>
      <section className="page-intro case-intro">
        <Link className="back-link" href="/cases"><ArrowLeft size={15} aria-hidden="true" /> All cases</Link>
        <Eyebrow>{item.domain}</Eyebrow>
        <h1>{item.title}</h1>
        <p className="page-intro-copy">{item.summary}</p>
        <div className="page-intro-meta">
          <Status tone="scenario">{item.scoringStatus.replaceAll("_", " ")}</Status>
          <Status tone="inferred">{item.classification.replaceAll("_", " ")}</Status>
          <Status tone="blocked">{item.recommendationStatus.replaceAll("_", " ")}</Status>
        </div>
      </section>
      <section className="page-content case-detail-grid">
        <article className="panel decision-panel">
          <p className="micro-label">Decision question</p>
          <h2>{item.decisionQuestion}</h2>
          <p>{item.evidenceBoundary}</p>
          <Link className="button button-primary button-small" href={`/workbench?case=${item.slug}`}>
            Run this case
          </Link>
        </article>
        <article className="panel decision-profile-panel">
          <p className="micro-label">Decision owner and stakeholders</p>
          <h2>{item.decisionProfile.decisionOwner}</h2>
          <div className="tag-row decision-tags">
            {item.decisionProfile.stakeholders.map((stakeholder) => <span key={stakeholder}>{stakeholder}</span>)}
          </div>
        </article>
        <article className="panel decision-profile-panel">
          <p className="micro-label">Capabilities exercised</p>
          <div className="capability-detail-list">
            {item.decisionProfile.capabilities.map((capability) => (
              <span key={capability}>{capability.replaceAll("-", " ")}</span>
            ))}
          </div>
        </article>
        <article className="panel decision-profile-panel">
          <p className="micro-label">Methods</p>
          <ul>
            {item.decisionProfile.methods.map((method) => <li key={method}>{method}</li>)}
          </ul>
        </article>
        <article className="panel decision-profile-panel">
          <p className="micro-label">User tasks</p>
          <ol>
            {item.decisionProfile.userTasks.map((task) => <li key={task}>{task}</li>)}
          </ol>
        </article>
        <article className="panel decision-profile-panel profile-guardrail">
          <p className="micro-label">Trade-offs and hard guardrail</p>
          <ul>
            {item.decisionProfile.tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}
          </ul>
          <p><strong>Guardrail:</strong> {item.decisionProfile.guardrail}</p>
        </article>
        <article className="panel">
          <p className="micro-label">Generated bounds</p>
          <div className="detail-bounds">
            <div><span>Lower</span><strong>{item.totalWeightedImpact.lower.toFixed(6)}</strong></div>
            <div><span>Central</span><strong>{item.totalWeightedImpact.central.toFixed(6)}</strong></div>
            <div><span>Upper</span><strong>{item.totalWeightedImpact.upper.toFixed(6)}</strong></div>
          </div>
          <p className="fine-print">Dimensionless weighted stress under declared assumptions—not a realized-loss estimate.</p>
        </article>
        <article className="panel">
          <p className="micro-label">Artifact identity</p>
          <dl className="key-values">
            <div><dt>Nodes / edges</dt><dd>{item.nodeCount} / {item.edgeCount}</dd></div>
            <div><dt>Snapshot</dt><dd className="mono digest">{item.snapshotDigest}</dd></div>
            <div><dt>Observability</dt><dd>{item.observabilityStatus.replaceAll("_", " ")}</dd></div>
          </dl>
        </article>
        <article className="panel source-panel">
          <p className="micro-label">Context—not numeric evidence</p>
          <h2>{item.context.title}</h2>
          <p>
            This official/public page motivates the stress question. It does not provide the topology, weights, shock magnitude, intervention effects, or outcome labels.
          </p>
          <a className="text-link" href={item.context.uri} rel="noreferrer" target="_blank">
            Open {item.context.publisher} <ExternalLink size={14} aria-hidden="true" />
          </a>
        </article>
        <article className="panel artifact-panel">
          <p className="micro-label">Independent verification</p>
          <h2>Rebuild the complete evidence chain.</h2>
          <pre><code>{item.rebuildCommand}{"\n"}npm run cascadelens -- verify content/{item.riskPackPath}</code></pre>
          <a className="button button-secondary button-small" download href={`/riskpacks/${item.slug}.zip`}>
            <Download size={15} aria-hidden="true" /> Download RiskPack
          </a>
        </article>
      </section>
    </PageShell>
  );
}
