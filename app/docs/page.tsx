import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "../components/page-shell";
import { Eyebrow } from "../components/status";

export const metadata: Metadata = {
  title: "Python Documentation",
  description: "Install CascadeLens, analyze a dependency graph, and verify a RiskPack with Python.",
};

const install = `pip install "cascadelens @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.4.0"
cascadelens demo --out demo-riskpack`;

const ownGraph = `cascadelens run \\
  --graph examples/data/simple_edges.csv \\
  --out my-analysis.json`;

const pythonApi = `from cascadelens import analyze, default_scenario, load_graph

graph = load_graph("examples/data/simple_graph.graphml")
scenario = default_scenario(graph, magnitude=0.6)
result = analyze(graph, scenario)

print(result.bounds["central"]["totalWeightedImpact"])
print(result.benchmark["status"])`;

export default function DocsPage() {
  return (
    <PageShell>
      <section className="page-intro">
        <Eyebrow>Python 3.11+ · no mandatory runtime dependencies</Eyebrow>
        <h1>From dependency graph to auditable RiskPack.</h1>
        <p className="page-intro-copy">
          Start with one install line, import JSON, CSV, GraphML, or NetworkX,
          then recompute every reported bound and intervention from packaged inputs.
        </p>
      </section>

      <section className="page-content docs-layout">
        <aside className="docs-nav">
          <a href="#install">Install</a>
          <a href="#run">Own graph</a>
          <a href="#verify">Verify</a>
          <a href="#python">Python API</a>
          <a href="#notebook">Jupyter</a>
          <a href="#methods">Methods</a>
          <a href="#hosted">Hosted app</a>
          <a href="#security">Security</a>
        </aside>

        <article className="prose docs-prose">
          <section id="install">
            <Eyebrow>60-second start</Eyebrow>
            <h2>Install and produce a verified demo pack</h2>
            <pre><code>{install}</code></pre>
            <p>
              The demo writes a checksummed RiskPack and verifies it before exiting.
              It is a reproducibility example, not empirical validation.
            </p>
          </section>

          <section id="run">
            <Eyebrow>Bring your own graph</Eyebrow>
            <h2>Analyze CSV, JSON, or GraphML</h2>
            <pre><code>{ownGraph}</code></pre>
            <p>
              With no ShockScript, the CLI creates an explicit synthetic starter
              shock on the first node. Imported topology is conservatively labelled <code>MODEL_INFERRED</code>.
              Add explicit evidence metadata when you can support a stronger claim.
            </p>
            <p>
              <a className="text-link" href="https://github.com/limingrui679-design/CascadeLens/blob/main/docs/tutorials/02_bring_your_own_graph.md" rel="noreferrer" target="_blank">
                Follow the graph-import tutorial ↗
              </a>
            </p>
          </section>

          <section id="verify">
            <Eyebrow>Evidence envelope</Eyebrow>
            <h2>Recompute an exported RiskPack</h2>
            <pre><code>cascadelens verify my-riskpack</code></pre>
            <p>
              Verification checks file digests, reloads the packaged graph and
              scenario, and recomputes cascade bounds, intervention rankings, and
              benchmark status. A valid pack proves internal consistency—not real-world accuracy.
            </p>
          </section>

          <section id="python">
            <Eyebrow>Python API</Eyebrow>
            <h2>Use the engine in analysis code</h2>
            <pre><code>{pythonApi}</code></pre>
            <p>
              NetworkX adapters are available through <code>cascadelens[networkx]</code>.
              The public Python engine is parity-tested against all 12 published reference cases.
            </p>
          </section>

          <section id="notebook">
            <Eyebrow>Jupyter</Eyebrow>
            <h2>Inspect each step interactively</h2>
            <pre><code>{`pip install "cascadelens[notebook] @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.4.0"
jupyter lab examples/notebooks/bring_your_own_graph.ipynb`}</code></pre>
            <p>
              The notebook keeps graph import, shock definition, uncertainty bounds,
              and intervention comparison visible as separate steps.
            </p>
          </section>

          <section id="methods">
            <Eyebrow>Formal specification</Eyebrow>
            <h2>Know what the model does—and where it fails</h2>
            <p>
              The methods note defines the daily cascade equations, evidence grades,
              baseline relationships, intervention objective, and failure conditions.
            </p>
            <p>
              <a className="text-link" href="https://github.com/limingrui679-design/CascadeLens/blob/main/docs/METHODS.md" rel="noreferrer" target="_blank">
                Read Methods and Model Boundaries ↗
              </a>
              <br />
              <Link className="text-link" href="/methodology">View the visual methodology →</Link>
            </p>
          </section>

          <section id="hosted">
            <Eyebrow>Browser compatibility layer</Eyebrow>
            <h2>Run all 12 cases without installation</h2>
            <p>
              The hosted TypeScript workbench mirrors the reference engine for local,
              browser-only exploration. Uploads stay in the browser and are not sent to a server.
            </p>
            <p><Link className="text-link" href="/workbench">Open the Workbench →</Link></p>
            <p>Maintainers can verify the hosted layer with:</p>
            <pre><code>{`npm ci
npm run ci`}</code></pre>
          </section>

          <section id="security">
            <Eyebrow>Untrusted input</Eyebrow>
            <h2>Bounded parsers and fail-closed packs</h2>
            <p>
              Graph and scenario inputs have size and structure limits. RiskPack
              verification rejects missing files, checksum mismatches, unsupported
              versions, and paths that escape the pack directory.
            </p>
            <p>
              <a className="text-link" href="https://github.com/limingrui679-design/CascadeLens/security/policy" rel="noreferrer" target="_blank">
                Read the security policy ↗
              </a>
            </p>
          </section>
        </article>
      </section>
    </PageShell>
  );
}
