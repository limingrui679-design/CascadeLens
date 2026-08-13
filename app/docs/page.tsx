import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/page-shell";
import { Eyebrow } from "../components/status";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Install, run, verify, and extend CascadeLens.",
};

const commands = `git clone https://github.com/limingrui679-design/CascadeLens.git
cd CascadeLens
npm ci
npm run generate:catalog
npm run generate:cases
npm run ci`;

export default function DocsPage() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>Developer documentation</Eyebrow>
        <h1>Rebuild the result, not just the interface.</h1>
        <p className="page-intro-copy">The local profile requires Node.js 22.13 or newer and no database, account, or API key for bundled reference cases.</p>
      </section>
      <section className="page-content docs-layout">
        <aside className="docs-nav">
          <a href="#install">Install</a><a href="#run">Run</a><a href="#verify">Verify</a><a href="#sdk">SDK</a><a href="#schemas">Schemas</a><a href="#extend">Extend</a><a href="#security">Security</a>
        </aside>
        <article className="prose docs-prose">
          <section id="install"><Eyebrow>Quick start</Eyebrow><h2>Fresh install</h2><pre><code>{commands}</code></pre><p><code>npm ci</code> installs the exact lockfile. <code>npm run ci</code> runs lint, strict type checking, content and case verification, unit and integration tests, a production build, rendered-route and accessibility audits, security gates, and a 20,000-node performance smoke profile.</p></section>
          <section id="run"><Eyebrow>CLI</Eyebrow><h2>Run an executable case</h2><pre><code>{`npm run cascadelens -- run \\\n  content/cases/suez-route-restress/scenario.json \\\n  --graph content/cases/suez-route-restress/graph/snapshot.json \\\n  --out local-results.json`}</code></pre><p>The CLI refuses to overwrite the output and labels it <code>scenario_output_not_empirical_validation</code>.</p></section>
          <section id="verify"><Eyebrow>RiskPack</Eyebrow><h2>Recompute all twelve packs</h2><pre><code>npm run cascadelens -- cases verify all</code></pre><p>Verification validates strict metadata schemas, binds each assumption to an exact parameter and exact-byte source, checks model-card and limitation semantics, and recomputes cascade bounds, intervention analysis, observability, and benchmark output from packaged inputs. An optional external expected digest adds publisher-identity checking; neither mode establishes empirical validity.</p></section>
          <section id="sdk"><Eyebrow>TypeScript</Eyebrow><h2>Use the SDK offline</h2><pre><code>{`import { analyzeScenario } from "cascadelens/sdk";

const { bounds, interventions, benchmark } =
  await analyzeScenario(snapshot, scenario);`}</code></pre><p>Without separated outcomes, <code>benchmark.status</code> is <code>scenario_only</code>.</p></section>
          <section id="schemas"><Eyebrow>Contracts</Eyebrow><h2>Published JSON schemas</h2><ul><li><code>worldgraph-0.1.0.schema.json</code></li><li><code>shockscript-0.1.0.schema.json</code></li><li><code>riskpack-manifest-0.1.0.schema.json</code></li><li><code>assumption-register-1.0.0.schema.json</code></li><li><code>model-card-1.0.0.schema.json</code></li><li><code>riskpack-limitations-1.0.0.schema.json</code></li></ul><p>Unsupported versions, unknown fields, incomplete parameter bindings, and contradictory metadata fail closed. Migrations create new artifacts and never mutate the original evidence pack.</p></section>
          <section id="extend"><Eyebrow>Contribution</Eyebrow><h2>Engines, connectors, and cases</h2><p>New engines implement a versioned plugin interface. New connectors declare official endpoints, licensing, host and response limits, field lineage, and boundaries. Historical replays need a frozen cutoff and separated outcomes.</p><p><a className="text-link" href="https://github.com/limingrui679-design/CascadeLens/blob/main/docs/EXTENDING.md" rel="noreferrer" target="_blank">Read the full extension contract ↗</a></p></section>
          <section id="security"><Eyebrow>Security</Eyebrow><h2>Untrusted input limits</h2><p>ShockScripts are capped at 1 MB with bounded aliases, nesting, values, and intervention count. Network connectors require HTTPS, allowlisted hosts, bounded time and size, redacted secrets, rate limits, and blocked redirects. The CLI rejects symbolic file inputs and path traversal in RiskPacks.</p><p><Link className="text-link" href="/data">Inspect connector acquisition modes →</Link></p></section>
        </article>
      </section>
    </PageShell>
  );
}
