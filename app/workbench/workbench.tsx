"use client";

import { Download, FileText, Github, Link2, Play, RotateCcw, Upload } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  analyzeInterventions,
  parseShockScript,
  runCascadeBounds,
  type CascadeBounds,
  type GraphSnapshot,
  type InterventionAnalysis,
  type ShockDefinition,
  type ShockScenario,
} from "../../packages/core/src/index";
import { Status } from "../components/status";
import type { WorkbenchCase } from "./case-data";
import { buildDecisionBrief } from "./decision-brief";
import { buildWorkbenchExport } from "./export";
import { importGraphFile, importScenarioFile, starterScenario } from "./imports";
import {
  computeSensitivitySurface,
  sensitivityLevels,
  type SensitivityCell,
} from "./sensitivity";

interface WorkbenchProps {
  cases: WorkbenchCase[];
  initialMagnitude?: number;
  initialSlug?: string;
  initialTransmission?: number;
}
interface ActiveData {
  bounds: CascadeBounds;
  decisionProfile: WorkbenchCase["decisionProfile"];
  decisionQuestion: string;
  domain: string;
  interventions: InterventionAnalysis;
  origin: "reviewed" | "user";
  scenario: ShockScenario;
  slug: string;
  snapshot: GraphSnapshot;
}

const importedDecisionProfile: WorkbenchCase["decisionProfile"] = {
  decisionOwner: "User-defined decision owner",
  stakeholders: ["data owner", "decision owner", "affected stakeholders"],
  capabilities: [
    "system-mapping",
    "uncertainty-bounds",
    "evidence-governance",
    "reproducible-computation",
  ],
  methods: [
    "local graph import",
    "bounded propagation",
    "feasible intervention analysis",
  ],
  userTasks: [
    "verify imported topology and licenses",
    "test declared assumptions",
    "define the evidence required before action",
  ],
  tradeoffs: [
    "speed of exploration versus evidence quality",
    "model coverage versus review burden",
  ],
  guardrail:
    "Imported data remain user-provided and unverified; the browser result is not empirical validation or an operational recommendation.",
};

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function magnitudeControl(shock: ShockDefinition) {
  switch (shock.operation) {
    case "disable":
      return {
        disabled: true,
        label: "Binary disable",
        maximum: 1,
        minimum: 1,
        step: 1,
        help: "This reviewed operation is binary. Use the sensitivity surface to inspect partial-capacity severity from 0.1 to 0.9.",
      };
    case "increase_demand":
      return {
        disabled: false,
        label: "Demand increase",
        maximum: Math.max(4, Math.ceil(shock.magnitude)),
        minimum: 0,
        step: 0.05,
        help: "Proportional increase in demand; 1.2 means demand rises by 120%.",
      };
    case "multiply_capacity":
      return {
        disabled: false,
        label: "Capacity multiplier",
        maximum: 1,
        minimum: 0,
        step: 0.01,
        help: "Remaining share of capacity after the stress; lower values are more severe.",
      };
    default:
      return {
        disabled: false,
        label: "Shock magnitude",
        maximum: Math.max(1, Math.ceil(shock.magnitude)),
        minimum: 0,
        step: 0.01,
        help: "Non-negative magnitude interpreted by the declared shock operation.",
      };
  }
}

function fromCase(item: WorkbenchCase): ActiveData {
  return { ...item, origin: "reviewed" };
}

export function Workbench({
  cases,
  initialMagnitude,
  initialSlug,
  initialTransmission,
}: WorkbenchProps) {
  const first = cases.find((item) => item.slug === initialSlug) ?? cases[0];
  const firstMagnitudeControl = magnitudeControl(first.scenario.shocks[0]);
  const [active, setActive] = useState<ActiveData>(() => fromCase(first));
  const [selectedSlug, setSelectedSlug] = useState(first.slug);
  const [magnitude, setMagnitude] = useState(
    bounded(
      initialMagnitude ?? first.scenario.shocks[0].magnitude,
      firstMagnitudeControl.minimum,
      firstMagnitudeControl.maximum,
    ),
  );
  const [transmission, setTransmission] = useState(
    bounded(initialTransmission ?? first.scenario.propagation.transmission, 0, 1),
  );
  const [bounds, setBounds] = useState(first.bounds);
  const [interventions, setInterventions] = useState(first.interventions);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("Verified precomputed result loaded.");
  const [shockText, setShockText] = useState("");
  const [showGitHub, setShowGitHub] = useState(false);
  const [sensitivity, setSensitivity] = useState<SensitivityCell[] | null>(null);

  const originalMagnitude = active.scenario.shocks[0].magnitude;
  const originalTransmission = active.scenario.propagation.transmission;
  const magnitudeConfig = magnitudeControl(active.scenario.shocks[0]);

  const activeScenario = useMemo<ShockScenario>(
    () => ({
      ...active.scenario,
      shocks: active.scenario.shocks.map((shock, index) =>
        index === 0 ? { ...shock, magnitude } : shock,
      ),
      propagation: { ...active.scenario.propagation, transmission },
    }),
    [active.scenario, magnitude, transmission],
  );

  function installData(next: ActiveData, note: string) {
    setActive(next);
    setBounds(next.bounds);
    setInterventions(next.interventions);
    setMagnitude(next.scenario.shocks[0].magnitude);
    setTransmission(next.scenario.propagation.transmission);
    setShowGitHub(false);
    setSensitivity(null);
    setMessage(note);
  }

  function chooseCase(slug: string) {
    const next = cases.find((item) => item.slug === slug);
    if (!next) return;
    setSelectedSlug(slug);
    installData(fromCase(next), `Verified ${next.scenario.title} result loaded.`);
    const parameters = new URLSearchParams({ case: slug });
    window.history.replaceState(null, "", `${window.location.pathname}?${parameters}`);
  }

  async function compute(snapshot: GraphSnapshot, scenario: ShockScenario) {
    return Promise.all([
      runCascadeBounds(snapshot, scenario),
      analyzeInterventions(snapshot, scenario),
    ]);
  }

  async function run() {
    setRunning(true);
    setMessage("Running deterministic bounds and exhaustive feasible bundles…");
    try {
      const [[nextBounds, nextInterventions], nextSensitivity] = await Promise.all([
        compute(active.snapshot, activeScenario),
        computeSensitivitySurface(active.snapshot, activeScenario),
      ]);
      setBounds(nextBounds);
      setInterventions(nextInterventions);
      setSensitivity(nextSensitivity);
      if (active.origin === "reviewed") {
        const parameters = new URLSearchParams(window.location.search);
        parameters.set("case", active.slug);
        parameters.set("magnitude", magnitude.toFixed(2));
        parameters.set("transmission", transmission.toFixed(2));
        window.history.replaceState(null, "", `${window.location.pathname}?${parameters}`);
      }
      setMessage(
        active.origin === "reviewed"
          ? "Run complete. Bounds, feasible bundles, and the 5 × 5 sensitivity surface were recomputed; outputs remain scenario-only."
          : "Run complete locally. Imported data were not uploaded; bounds and sensitivity remain scenario-only.",
      );
      setShowGitHub(true);
    } catch (error) {
      setMessage(error instanceof Error ? `Run blocked: ${error.message}` : "Run blocked.");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setMagnitude(originalMagnitude);
    setTransmission(originalTransmission);
    setBounds(active.bounds);
    setInterventions(active.interventions);
    if (active.origin === "reviewed") {
      window.history.replaceState(null, "", `${window.location.pathname}?case=${active.slug}`);
    }
    setShowGitHub(false);
    setSensitivity(null);
    setMessage(active.origin === "reviewed" ? "Verified precomputed result restored." : "Imported starter result restored.");
  }

  async function share() {
    if (active.origin === "user") {
      setMessage("Imported files stay on this device. Export JSON to preserve this state.");
      return;
    }
    const parameters = new URLSearchParams({
      case: active.slug,
      magnitude: magnitude.toFixed(2),
      transmission: transmission.toFixed(2),
    });
    const uri = `${window.location.origin}${window.location.pathname}?${parameters}`;
    try {
      await navigator.clipboard.writeText(uri);
      setMessage("Shareable scenario URL copied.");
    } catch {
      setMessage(`Share this URL: ${uri}`);
    }
  }

  function saveArtifact(filename: string, mediaType: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: mediaType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function download() {
    const artifact = buildWorkbenchExport({
      scenario: activeScenario,
      snapshot: active.snapshot,
      bounds,
      interventions,
    });
    saveArtifact(artifact.filename, artifact.mediaType, artifact.text);
    setShowGitHub(true);
    setMessage("Analysis downloaded. Use the Python CLI to create a recomputation-verifiable RiskPack.");
  }

  function downloadBrief() {
    const artifact = buildDecisionBrief({
      bounds,
      decisionProfile: active.decisionProfile,
      decisionQuestion: active.decisionQuestion,
      domain: active.domain,
      interventions,
      scenario: activeScenario,
      slug: active.slug,
      snapshotDigest: active.snapshot.contentDigest,
    });
    saveArtifact(artifact.filename, artifact.mediaType, artifact.text);
    setShowGitHub(true);
    setMessage("Decision brief downloaded. It preserves the scenario-only and evidence-required boundaries.");
  }

  async function graphUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setRunning(true);
    setMessage(`Importing ${file.name} locally…`);
    try {
      const snapshot = await importGraphFile(file);
      const scenario = starterScenario(snapshot);
      const [nextBounds, nextInterventions] = await compute(snapshot, scenario);
      setSelectedSlug("__user__");
      installData(
        {
          slug: "user-graph",
          origin: "user",
          domain: "User-provided graph",
          decisionQuestion:
            "What bounded stress follows from this user-provided topology and the generated starter assumptions?",
          decisionProfile: importedDecisionProfile,
          snapshot,
          scenario,
          bounds: nextBounds,
          interventions: nextInterventions,
        },
        `Imported ${file.name}: ${snapshot.nodes.length} nodes / ${snapshot.edges.length} edges. A scenario-only starter was generated.`,
      );
      window.history.replaceState(null, "", window.location.pathname);
    } catch (error) {
      setMessage(error instanceof Error ? `Import blocked: ${error.message}` : "Import blocked.");
    } finally {
      setRunning(false);
    }
  }

  async function installScenario(scenario: ShockScenario, label: string) {
    setRunning(true);
    setMessage(`Validating ${label} against the active graph…`);
    try {
      const [nextBounds, nextInterventions] = await compute(active.snapshot, scenario);
      setSelectedSlug("__user__");
      installData(
        {
          ...active,
          slug: "custom-shockscript",
          origin: "user",
          decisionQuestion:
            "What bounded stress follows when this user-provided ShockScript is applied to the active graph?",
          decisionProfile: importedDecisionProfile,
          scenario,
          bounds: nextBounds,
          interventions: nextInterventions,
        },
        `${label} loaded and run locally. Outputs remain scenario-only unless separated outcomes are supplied outside the browser.`,
      );
      window.history.replaceState(null, "", window.location.pathname);
    } catch (error) {
      setMessage(error instanceof Error ? `ShockScript blocked: ${error.message}` : "ShockScript blocked.");
    } finally {
      setRunning(false);
    }
  }

  async function scenarioUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await installScenario(await importScenarioFile(file), file.name);
    } catch (error) {
      setMessage(error instanceof Error ? `ShockScript blocked: ${error.message}` : "ShockScript blocked.");
    }
  }

  async function applyPastedScenario() {
    if (!shockText.trim()) {
      setMessage("Paste a JSON or YAML ShockScript first.");
      return;
    }
    try {
      await installScenario(parseShockScript(shockText), "Pasted ShockScript");
    } catch (error) {
      setMessage(error instanceof Error ? `ShockScript blocked: ${error.message}` : "ShockScript blocked.");
    }
  }

  const recommended = interventions.recommendedBundleIds.map(
    (id) => active.scenario.interventions.find((item) => item.id === id)?.label ?? id,
  );

  return (
    <div className="workbench-layout">
      <aside className="workbench-controls" aria-label="Scenario controls">
        <div className="control-head">
          <div>
            <p className="micro-label">ShockScript · {active.scenario.schemaVersion}</p>
            <h2>{active.scenario.title}</h2>
          </div>
          <Status tone="scenario">scenario only</Status>
        </div>

        <label className="workbench-select">
          <span>Reviewed case</span>
          <select value={selectedSlug} onChange={(event) => chooseCase(event.target.value)}>
            {cases.map((item, index) => (
              <option key={item.slug} value={item.slug}>{String(index + 1).padStart(2, "0")} · {item.scenario.title}</option>
            ))}
            {selectedSlug === "__user__" ? <option value="__user__">User-provided inputs</option> : null}
          </select>
        </label>

        <div className="import-actions" aria-label="Import local inputs">
          <label className="file-button">
            <Upload size={14} aria-hidden="true" /> Import graph
            <input accept=".json,.csv,.graphml,.xml" onChange={graphUpload} type="file" />
          </label>
          <label className="file-button">
            <Upload size={14} aria-hidden="true" /> Import ShockScript
            <input accept=".json,.yaml,.yml" onChange={scenarioUpload} type="file" />
          </label>
        </div>

        <details className="paste-script">
          <summary>Paste ShockScript</summary>
          <textarea
            aria-label="Paste JSON or YAML ShockScript"
            onChange={(event) => setShockText(event.target.value)}
            placeholder="Paste JSON or YAML…"
            value={shockText}
          />
          <button className="button button-secondary button-small" disabled={running} onClick={applyPastedScenario} type="button">
            Apply to active graph
          </button>
        </details>

        <div className="boundary-warning">
          {active.origin === "reviewed"
            ? "All topology and numeric parameters are declared assumptions. This run is not historically scored."
            : "Files are processed in this browser and not uploaded. Imported topology remains unverified MODEL_INFERRED evidence."}
        </div>

        <label className="range-control">
          <span>
            <b>{magnitudeConfig.label}</b>
            <input
              aria-label={`${magnitudeConfig.label} value`}
              className="numeric-input"
              disabled={magnitudeConfig.disabled}
              max={magnitudeConfig.maximum}
              min={magnitudeConfig.minimum}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) {
                  setMagnitude(bounded(value, magnitudeConfig.minimum, magnitudeConfig.maximum));
                  setSensitivity(null);
                }
              }}
              step={magnitudeConfig.step}
              type="number"
              value={magnitude}
            />
          </span>
          <input
            aria-label={`${magnitudeConfig.label} slider`}
            aria-describedby="magnitude-help"
            disabled={magnitudeConfig.disabled}
            max={magnitudeConfig.maximum}
            min={magnitudeConfig.minimum}
            onChange={(event) => {
              setMagnitude(Number(event.target.value));
              setSensitivity(null);
            }}
            step={magnitudeConfig.step}
            type="range"
            value={magnitude}
          />
          <small id="magnitude-help">{magnitudeConfig.help}</small>
        </label>

        <label className="range-control">
          <span>
            <b>Transmission</b>
            <input
              aria-label="Transmission value"
              className="numeric-input"
              max="1"
              min="0"
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) {
                  setTransmission(bounded(value, 0, 1));
                  setSensitivity(null);
                }
              }}
              step="0.01"
              type="number"
              value={transmission}
            />
          </span>
          <input
            aria-label="Transmission slider"
            aria-describedby="transmission-help"
            max="1"
            min="0"
            onChange={(event) => {
              setTransmission(Number(event.target.value));
              setSensitivity(null);
            }}
            step="0.01"
            type="range"
            value={transmission}
          />
          <small id="transmission-help">Share of upstream stress passed across each eligible edge.</small>
        </label>

        <fieldset className="fixed-controls">
          <legend>Frozen contract</legend>
          <dl>
            <div><dt>Decision cutoff</dt><dd>{active.scenario.decisionCutoff.slice(0, 10)}</dd></div>
            <div><dt>Horizon</dt><dd>{Math.max(...active.scenario.propagation.horizonsDays)} days</dd></div>
            <div><dt>Graph</dt><dd>{active.snapshot.nodes.length} nodes / {active.snapshot.edges.length} edges</dd></div>
            <div><dt>Engine</dt><dd>{active.scenario.propagation.engine}</dd></div>
          </dl>
        </fieldset>

        <div className="control-actions">
          <button className="button button-primary" disabled={running} onClick={run} type="button">
            <Play size={15} aria-hidden="true" /> {running ? "Running…" : "Run scenario"}
          </button>
          <button aria-label="Reset scenario" className="icon-button" onClick={reset} type="button"><RotateCcw size={17} /></button>
        </div>
      </aside>

      <section className="workbench-results" aria-busy={running}>
        <div className="result-head">
          <div>
            <p className="micro-label">Bounded cascade result</p>
            <h2>Unknown links stay visible.</h2>
          </div>
          <div className="result-actions">
            <button className="icon-text-button" onClick={share} type="button"><Link2 size={15} /> Share state</button>
            <button className="icon-text-button" onClick={download} type="button"><Download size={15} /> Export JSON</button>
            <button className="icon-text-button" onClick={downloadBrief} type="button"><FileText size={15} /> Decision brief</button>
          </div>
        </div>

        <p aria-live="polite" className="run-message">{message}</p>
        {showGitHub ? (
          <div className="github-star-callout">
            <span>Useful for your analysis?</span>
            <a href="https://github.com/limingrui679-design/CascadeLens" rel="noreferrer" target="_blank">
              <Github size={15} aria-hidden="true" /> View source · Star on GitHub
            </a>
          </div>
        ) : null}

        <div className="workbench-bounds">
          {(
            [
              ["Lower", bounds.lower, "Observed and entity-reported edges"],
              ["Central", bounds.central, "Adds third-party verified edges"],
              ["Upper", bounds.upper, "Adds extracted and inferred edges"],
            ] as const
          ).map(([label, result, note]) => (
            <article key={label}>
              <span>{label}</span>
              <strong>{result.totalWeightedImpact.toFixed(4)}</strong>
              <small>{note} · {result.horizonDays}-day mean</small>
              <progress aria-label={`${label} bounded cascade impact`} max={1} value={result.totalWeightedImpact} />
            </article>
          ))}
        </div>

        <div className="workbench-grid">
          <article className="panel decision-context-panel">
            <p className="micro-label">Decision context · {active.domain}</p>
            <h3>{active.decisionQuestion}</h3>
            <p><b>Owner:</b> {active.decisionProfile.decisionOwner}</p>
            <div className="tag-row">
              {active.decisionProfile.capabilities.slice(0, 5).map((capability) => (
                <span key={capability}>{capability.replaceAll("-", " ")}</span>
              ))}
            </div>
          </article>

          <article className="panel">
            <p className="micro-label">Decision gate</p>
            <div className="decision-status-row">
              <Status tone="blocked">{interventions.recommendationStatus.replaceAll("_", " ")}</Status>
            </div>
            <h3>{recommended.length ? recommended.join(" + ") : "No eligible intervention bundle"}</h3>
            <p>
              The numerically lowest upper-bound bundle is not promoted to an operational recommendation when intervention effects remain assumptions.
            </p>
          </article>

          <article className="panel">
            <p className="micro-label">Pareto frontier</p>
            <div className="pareto-list">
              {interventions.paretoFrontier.map((bundle) => (
                <div key={bundle.interventionIds.join("|") || "do-nothing"}>
                  <span>{bundle.interventionIds.length ? bundle.interventionIds.map((id) => id.split(":").at(-1)).join(" + ") : "do nothing"}</span>
                  <b>{bundle.cost.toFixed(0)} cost</b>
                  <em>{bundle.worstCaseImpact?.toFixed(4)}</em>
                </div>
              ))}
            </div>
          </article>

          <article className="panel impact-list-panel">
            <p className="micro-label">Upper-bound affected nodes · mean / peak / end</p>
            <ol className="impact-list">
              {bounds.upper.impacts.slice(0, 5).map((impact) => {
                const node = active.snapshot.nodes.find((item) => item.id === impact.nodeId);
                return (
                  <li key={impact.nodeId}>
                    <span>{node?.label ?? impact.nodeId}</span>
                    <b>{impact.impact.toFixed(4)} / {impact.peakImpact.toFixed(4)} / {impact.endImpact.toFixed(4)}</b>
                  </li>
                );
              })}
            </ol>
          </article>
        </div>

        <article className="panel sensitivity-panel">
          <div className="sensitivity-head">
            <div>
              <p className="micro-label">Assumption sensitivity · upper bound</p>
              <h3>Does the conclusion survive a wider parameter surface?</h3>
            </div>
            <span>{sensitivity ? "25 recomputed runs" : "Run the scenario to generate"}</span>
          </div>
          {sensitivity ? (
            <table className="sensitivity-table">
              <caption>
                Rows vary transmission; columns vary normalized shock severity. Each cell is the dimensionless upper-bound weighted stress.
                Binary disable cases use a disclosed partial-capacity proxy only inside this surface; the base run remains binary.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Transmission ↓ / Severity →</th>
                  {sensitivityLevels.map((level) => <th key={level} scope="col">{level.toFixed(1)}</th>)}
                </tr>
              </thead>
              <tbody>
                {sensitivityLevels.map((gridTransmission) => {
                  const values = sensitivity.filter((cell) => cell.transmission === gridTransmission);
                  const impacts = sensitivity.map((cell) => cell.impact);
                  const minimum = Math.min(...impacts);
                  const maximum = Math.max(...impacts);
                  return (
                    <tr key={gridTransmission}>
                      <th scope="row">{gridTransmission.toFixed(1)}</th>
                      {values.map((cell) => {
                        const normalized = maximum === minimum ? 0 : (cell.impact - minimum) / (maximum - minimum);
                        const bucket = Math.min(4, Math.floor(normalized * 5));
                        return <td className={`heat-${bucket}`} key={cell.severity}>{cell.impact.toFixed(3)}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="sensitivity-empty">The current cards show one declared run. Recompute to compare 25 normalized-severity–transmission combinations without treating them as probabilities.</p>
          )}
        </article>

        <div className="workbench-disclaimer">
          Lower and central results can exclude imported or model-inferred dependency edges. Upper results add those assumed links. Values are dimensionless stress indices; gaps between bounds show evidence eligibility, not statistical confidence.
        </div>
      </section>
    </div>
  );
}
