# CascadeLens

<p align="center">
  <strong>Trace how disruption becomes systemic risk—without hiding where the evidence ends.</strong><br />
  Evidence-graded graphs · executable shocks · bounded decisions · recomputable proof
</p>

<p align="center">
  <a href="https://github.com/limingrui679-design/CascadeLens/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/limingrui679-design/CascadeLens/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="https://github.com/limingrui679-design/CascadeLens/actions/workflows/codeql.yml"><img alt="CodeQL" src="https://github.com/limingrui679-design/CascadeLens/actions/workflows/codeql.yml/badge.svg" /></a>
  <a href="https://github.com/limingrui679-design/CascadeLens/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/limingrui679-design/CascadeLens?style=flat" /></a>
  <a href="LICENSE"><img alt="Apache-2.0 license" src="https://img.shields.io/github/license/limingrui679-design/CascadeLens" /></a>
  <a href="pyproject.toml"><img alt="Python 3.11 or newer" src="https://img.shields.io/badge/Python-%E2%89%A53.11-3776AB?logo=python&amp;logoColor=white" /></a>
</p>

<p align="center">
  <a href="https://cascadelens.limingrui2.chatgpt.site"><strong>Open the live product</strong></a>
  · <a href="#60-second-python-start">Run in 60 seconds</a>
  · <a href="#explore-all-16-cases">Explore 16 cases</a>
  · <a href="docs/README.md">Read the docs</a>
  · <a href="docs/SELF_REVIEW_2026-08-20_v0.6.0.md">Inspect the evidence</a>
</p>

![CascadeLens overview showing the Suez route scenario, bounded results, and verified release scope](docs/assets/readme/overview.jpg)

CascadeLens turns a sourced **WorldGraph snapshot**, a **frozen decision cutoff**, and a versioned **ShockScript** into an auditable decision artifact.

Each run reports **lower, central, and upper impacts**, exposes **feasible Pareto trade-offs**, returns `scenario_only` when outcomes are insufficient, and writes a **RiskPack whose metadata and analytical outputs are recomputed** during verification.

## 60-second Python start

```bash
pip install "cascadelens @ git+https://github.com/limingrui679-design/CascadeLens.git@v0.6.0"
cascadelens demo --out demo-riskpack
```

The second command runs a complete scenario, writes a checksummed RiskPack, and recomputes it. No Node.js setup or external data is required.

<table>
  <tr>
    <td width="33%" valign="top"><strong>Use your graph</strong><br /><sub>JSON · CSV · GraphML · NetworkX</sub><br /><a href="docs/tutorials/02_bring_your_own_graph.md">Import guide →</a></td>
    <td width="33%" valign="top"><strong>Use Python</strong><br /><sub>CLI · API · Jupyter</sub><br /><a href="docs/tutorials/01_python_quickstart.md">Quick start →</a></td>
    <td width="33%" valign="top"><strong>Check the method</strong><br /><sub>Equations · baselines · failure gates</sub><br /><a href="docs/METHODS.md">Methods →</a></td>
  </tr>
</table>

<p align="center">
  <img alt="Thirty-second CascadeLens Workbench demonstration: switch cases, change parameters, recompute bounds, and export analysis" src="docs/assets/readme/workbench-demo.gif" width="960" />
</p>
<p align="center"><sub>Real local run · 16-case selector · 5 × 5 normalized-severity surface · evidence-gated decision · JSON + decision-brief export</sub></p>

<table>
  <tr>
    <td align="center"><strong>16</strong><br /><sub>executable cases</sub></td>
    <td align="center"><strong>11</strong><br /><sub>connector contracts</sub></td>
    <td align="center"><strong>4,027</strong><br /><sub>normalized official-source facts</sub></td>
    <td align="center"><strong>PASS</strong><br /><sub>Node + Python unit suites</sub></td>
  </tr>
</table>

> [!IMPORTANT]
> Stable release: **[`v0.6.0`](https://github.com/limingrui679-design/CascadeLens/releases/tag/v0.6.0)**. It contains **0 historically scored cases**, **0 external validations**, **0 structured user studies**, **0 verified organizational adoptions**, and **0 demonstrated real-world impacts**. All 16 cases are deterministic, `scenario_only` research demonstrations—not forecasts or client projects.

## Explore all 16 cases

![CascadeLens capability matrix across sixteen complete scenario-only pipelines](docs/assets/readme/cases.jpg)

<table>
  <tr>
    <td width="25%" valign="top"><strong><a href="content/cases/suez-route-restress/README.md">01 · Suez route</a></strong><br /><sub>Maritime trade · chain</sub></td>
    <td width="25%" valign="top"><strong><a href="content/cases/semiconductor-capacity-restress/README.md">02 · Semiconductors</a></strong><br /><sub>Manufacturing · branch/merge</sub></td>
    <td width="25%" valign="top"><strong><a href="content/cases/medical-ppe-demand-restress/README.md">03 · Medical PPE</a></strong><br /><sub>Public health · branch/merge</sub></td>
    <td width="25%" valign="top"><strong><a href="content/cases/ukraine-commodity-compound-restress/README.md">04 · Commodity compound</a></strong><br /><sub>Food + energy · cycle</sub></td>
  </tr>
  <tr>
    <td valign="top"><strong><a href="content/cases/panama-drought-restress/README.md">05 · Panama drought</a></strong><br /><sub>Climate + logistics · activation</sub></td>
    <td valign="top"><strong><a href="content/cases/red-sea-rerouting-restress/README.md">06 · Red Sea routing</a></strong><br /><sub>Shipping · expiry</sub></td>
    <td valign="top"><strong><a href="content/cases/baltimore-port-restress/README.md">07 · Baltimore port</a></strong><br /><sub>Infrastructure · chain</sub></td>
    <td valign="top"><strong><a href="content/cases/refining-hurricane-restress/README.md">08 · Refining hurricane</a></strong><br /><sub>Energy · chain</sub></td>
  </tr>
  <tr>
    <td valign="top"><strong><a href="content/cases/critical-minerals-export-stress/README.md">09 · Critical minerals</a></strong><br /><sub>Technology policy · chain</sub></td>
    <td valign="top"><strong><a href="content/cases/ofac-list-change-stress/README.md">10 · Sanctions change</a></strong><br /><sub>Compliance · chain</sub></td>
    <td valign="top"><strong><a href="content/cases/drug-shortage-restress/README.md">11 · Drug shortage</a></strong><br /><sub>Medicine access · chain</sub></td>
    <td valign="top"><strong><a href="content/cases/food-export-compound-stress/README.md">12 · Food export compound</a></strong><br /><sub>Agriculture · compound</sub></td>
  </tr>
  <tr>
    <td valign="top"><strong><a href="content/cases/health-data-interoperability-stress/README.md">13 · Health interoperability</a></strong><br /><sub>Health IT · branch/merge</sub></td>
    <td valign="top"><strong><a href="content/cases/behavioral-intervention-evidence-stress/README.md">14 · Behavioral evidence</a></strong><br /><sub>Experimentation · branch/merge</sub></td>
    <td valign="top"><strong><a href="content/cases/place-based-regeneration-equity-stress/README.md">15 · Regeneration equity</a></strong><br /><sub>Housing + place · branch/merge</sub></td>
    <td valign="top"><strong><a href="content/cases/portfolio-concentration-fiduciary-stress/README.md">16 · Portfolio concentration</a></strong><br /><sub>Fiduciary risk · chain</sub></td>
  </tr>
</table>

> **9 context-grounded re-stresses + 7 synthetic stress fixtures.** Public pages frame questions; they do not supply the assumed topology, weights, shocks, or intervention effects.

### One comparison plane—not sixteen disconnected demos

| Decision lens | What the executable task makes visible |
|---|---|
| Health information systems | Terminology, provenance, accountable review, and population reporting |
| Behavioral evaluation | Measurement, assignment, response signals, reversible rollout, and null-result discipline |
| Place-based policy | Housing, access, local business continuity, affected groups, and transition costs |
| Portfolio risk | Concentration, liquidity, mandate constraints, beneficiary objectives, and fiduciary limits |

The generated [capability matrix](content/cases/capability-matrix.json) maps every case to 15 analytical, engineering, decision, and domain capabilities. The [live case library](https://cascadelens.limingrui2.chatgpt.site/cases) renders the same matrix and filters from the same specifications.

## Why CascadeLens

Most risk demos collapse sources, assumptions, inference, and outcomes into one number. CascadeLens keeps them separate from input to export.

```mermaid
flowchart LR
    A["Sources + manifests"] --> B["WorldGraph"]
    C["ShockScript"] --> D["Bounded engine"]
    B --> D
    D --> E["Lower"]
    D --> F["Central"]
    D --> G["Upper"]
    E & F & G --> H["InterventionLab"]
    E & F & G --> I["Observability frontier"]
    H & I --> J["RiskPack"]
    J --> K["Recompute + verify"]
```

<table>
  <tr>
    <td width="33%" valign="top"><strong>Evidence stays graded</strong><br /><sub>Observed, reported, verified, extracted, and inferred links never silently merge.</sub></td>
    <td width="33%" valign="top"><strong>Time stays explicit</strong><br /><sub>Valid time and knowledge time block future information at a frozen cutoff.</sub></td>
    <td width="33%" valign="top"><strong>Decisions stay reversible</strong><br /><sub>Costs, lead times, constraints, alternatives, and reversal thresholds remain visible.</sub></td>
  </tr>
</table>

## Develop the hosted interface

```bash
git clone https://github.com/limingrui679-design/CascadeLens.git
cd CascadeLens
npm ci
npm run generate:catalog
npm run generate:cases
npm run dev
```

Open `http://localhost:3000`, or use one focused path:

| Goal | Start here |
|---|---|
| Explore without installing | [Live product](https://cascadelens.limingrui2.chatgpt.site) |
| Analyze your own graph | `cascadelens run --graph <csv|json|graphml> --out analysis.json` |
| Use a notebook or NetworkX | [Jupyter + NetworkX guide](docs/tutorials/03_networkx_and_notebooks.md) |
| Create and verify a RiskPack | `cascadelens pack --graph <file> --out riskpack` · `cascadelens verify riskpack` |
| List or rebuild cases | `npm run cascadelens -- cases list` · `cases build <slug>` |
| Maintain the hosted demo | `npm ci` · `npm run ci` |

## Change an assumption. Watch the boundary move.

![CascadeLens workbench with editable shock assumptions, bounded results, and a Pareto frontier](docs/assets/readme/workbench.jpg)

<table>
  <tr>
    <td width="33%" valign="top"><strong>1 · Compile</strong><br /><sub>Edit a declared shock; never mutate the sealed source snapshot.</sub></td>
    <td width="33%" valign="top"><strong>2 · Compare</strong><br /><sub>See known, verified, and assumption envelopes side by side.</sub></td>
    <td width="33%" valign="top"><strong>3 · Export</strong><br /><sub>Share state or export machine-readable output for local verification.</sub></td>
  </tr>
</table>

The workbench switches among all 16 reviewed cases and accepts a user WorldGraph plus ShockScript. Each run can recompute a 5 × 5 normalized-severity–transmission sensitivity surface, export machine-readable JSON, and generate a stakeholder-facing Markdown decision brief that carries the same `scenario_only` and `evidence_required` boundaries. For binary disable operations, the surface discloses a partial-capacity proxy while preserving the binary reviewed base run. Imported topology stays user-provided and unverified.

## Every edge carries its own evidence

![WorldGraph explorer showing bitemporal evidence and an assumed dependency chain](docs/assets/readme/worldgraph.jpg)

| Grade | Lower | Central | Upper |
|---|:---:|:---:|:---:|
| Official observed | ✓ | ✓ | ✓ |
| Entity reported | ✓ | ✓ | ✓ |
| Third-party verified | — | ✓ | ✓ |
| Text extracted | — | — | ✓ |
| Model inferred | — | — | ✓ |

```mermaid
flowchart LR
    V["Valid time<br/>When was it true?"] --> G["Eligible graph at day t"]
    K["Knowledge time<br/>When was it knowable?"] --> G
    G --> R["Daily recomputation"]
    R --> O["Mean · peak · end state"]
```

Confidence never upgrades a weaker evidence grade. Extracted and inferred links remain outside lower and central estimates.

## One question → one verifiable RiskPack

```mermaid
flowchart LR
    Q["Decision question"] --> S["Sealed graph<br/>+ ShockScript"]
    S --> B["Lower · central · upper<br/>cascade bounds"]
    B --> D["Options · evidence priorities<br/>+ benchmark gate"]
    D --> R["Checksummed<br/>RiskPack"]
    R --> V["Independent recomputation<br/>verify or reject"]
```

<details>
<summary><strong>Open the complete RiskPack decision and verification graph</strong></summary>

```mermaid
flowchart TD
    Q["Decision question"] --> S["Sealed graph + ShockScript"]
    S --> B["Bounded cascade"]
    B --> P["Feasible Pareto set"]
    B --> O["Evidence priorities"]
    B --> C["Benchmark gate"]
    P & O & C --> R["RiskPack"]
    R --> V{"Independent recomputation"}
    V -->|match| PASS["VERIFIED RECOMPUTED"]
    V -->|mismatch| FAIL["Reject + locate failure"]
```

</details>

<details>
<summary><strong>What is inside a RiskPack?</strong></summary>

```text
riskpack/
├── sources/manifest.json
├── graph/snapshot.json
├── scenario.json
├── assumptions.json
├── model-card.json
├── limitations.json
├── results/
│   ├── cascade-bounds.json
│   ├── interventions.json
│   ├── observability.json
│   └── benchmark.json
├── checksums.sha256
└── REBUILD.txt
```

Verification validates schemas, paths, versions, semantic assumption bindings, model-card status, limitations, checksums, and every recomputed analytical output.

</details>

## Public data: what ships and what does not

<table>
  <tr>
    <td align="center"><strong>11</strong><br /><sub>bounded contracts</sub></td>
    <td align="center"><strong>4</strong><br /><sub>frozen official runs</sub></td>
    <td align="center"><strong>4,027</strong><br /><sub>normalized facts</sub></td>
    <td align="center"><strong>222</strong><br /><sub>published sector input edges</sub></td>
  </tr>
</table>

**Connectors:** UN Comtrade · OECD ICIO · SEC EDGAR · GLEIF · FAOSTAT · openFDA · OFAC · WITS · UNCTAD LSCI · IMF PortWatch · BEA Input-Output

Generic mapping preserves facts as metric nodes and refuses to invent topology. The BEA-specific mapper preserves 222 positive, published sector-average input coefficients as `MODEL_INFERRED` edges: upper bound only, never firm-level supplier links. Seven connectors currently ship contracts and fixtures without frozen public runs.

[Data catalog](docs/connectors/DATA_CATALOG.md) · [Connector contract](docs/connectors/CONNECTOR_CONTRACT.md) · [Data licenses](docs/DATA_LICENSES.md) · [Frozen-run ledger](content/snapshots/README.md)

## Release evidence, not a trust shortcut

<table>
  <tr>
    <td width="25%" align="center"><strong>20,000</strong><br /><sub>node smoke profile</sub></td>
    <td width="25%" align="center"><strong>19,999</strong><br /><sub>synthetic edges</sub></td>
    <td width="25%" align="center"><strong>2×</strong><br /><sub>offline build match</sub></td>
    <td width="25%" align="center"><strong>PASS</strong><br /><sub>CI + CodeQL at release</sub></td>
  </tr>
</table>

```mermaid
flowchart LR
    A["Clean source archive"] --> B["npm ci"]
    B --> C["Regenerate artifacts"]
    C --> D["Full CI"]
    D --> E["Two offline builds"]
    E --> F["Exact dist digest"]
    F --> G["Manifest + SBOM + receipt"]
```

The scale check is a synthetic chain engineering budget—not a production SLA or empirical-domain benchmark.

[Acceptance matrix](docs/ACCEPTANCE_MATRIX.md) · [Release process](docs/RELEASE_PROCESS.md) · [Performance](docs/PERFORMANCE.md) · [Security](SECURITY.md)

## Interfaces

| Surface | Use it for |
|---|---|
| [Workbench](https://cascadelens.limingrui2.chatgpt.site/workbench) | Edit bounded assumptions and compare feasible responses |
| [WorldGraph](https://cascadelens.limingrui2.chatgpt.site/worldgraph) | Inspect provenance, time, evidence grade, and eligibility |
| [Case library](https://cascadelens.limingrui2.chatgpt.site/cases) | Compare 16 pipelines, filter by capability, and download RiskPacks |
| [CascadeBench](https://cascadelens.limingrui2.chatgpt.site/benchmark) | See no-lookahead gates and honest scoring coverage |
| [Python CLI](docs/CLI.md) | Import, validate, run, pack, and verify locally |
| [Python API](docs/SDK.md) | Embed analysis in scripts, notebooks, or NetworkX workflows |
| TypeScript compatibility layer | Power the hosted browser demonstration |

## Repository map

```text
src/cascadelens/  canonical Python core + CLI  examples/      CSV · GraphML · Jupyter
app/              hosted browser product       content/       cases + reviewed artifacts
packages/         browser compatibility layer  schemas/       public JSON Schemas
tests_python/     Python parity + import gates  tests/         web + release assurance
docs/             methods + tutorials           scripts/       hosted build verification
```

| If you want to… | Open |
|---|---|
| Understand the design | [Architecture](docs/ARCHITECTURE.md) · [Product requirements](docs/PRODUCT_REQUIREMENTS.md) |
| Compare or add a case | [Capability matrix](docs/CASE_CAPABILITY_MATRIX.md) · [Extension guide](docs/EXTENDING.md) |
| Audit versions and compatibility | [Schema compatibility](docs/SCHEMA_COMPATIBILITY.md) · [Changelog](CHANGELOG.md) |
| Plan legitimate external validation | [External validation protocol](docs/EXTERNAL_VALIDATION_PROTOCOL.md) |
| Navigate everything | [Documentation hub](docs/README.md) |

## Evidence boundaries

| Demonstrated | Not demonstrated |
|---|---|
| Deterministic computation on checked fixtures | Predictive accuracy or calibrated real-world weights |
| Bitemporal no-lookahead enforcement | Complete or perfectly true public sources |
| Four reproducible public-data acquisition runs and 222 published sector-level input coefficients | A populated firm-level or current global dependency graph |
| Feasibility and value-of-information under declared assumptions | Operational, causal, clinical, legal, or investment advice |
| RiskPack integrity and analytical recomputation | Publisher identity without an external trust channel |
| Reproducible release engineering | Production SLA, adoption, or real-user impact |

> Public data are not client projects. Simulated impacts are not forecasts or realized losses. Internal reproducibility is not independent method review, security certification, external validation, adoption, or impact.

## Contributing

Connectors, engines, cases, product surfaces, documentation, and assurance improvements are welcome. Preserve source, time, license, evidence grade, and scenario status; then run:

```bash
python -m unittest discover -s tests_python -v
npm run ci
```

[Contribution guide](CONTRIBUTING.md) · [Code of Conduct](CODE_OF_CONDUCT.md) · [Private security reporting](SECURITY.md)

## Cite and license

Use [`CITATION.cff`](CITATION.cff) to cite the exact reviewed release. Licensed under [Apache-2.0](LICENSE). © 2026 Mingrui Li.
