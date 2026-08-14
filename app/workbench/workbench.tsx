"use client";

import { Download, Github, Link2, Play, RotateCcw, Upload } from "lucide-react";
import { useMemo, useState, type ChangeEvent } from "react";
import {
  analyzeInterventions,
  parseShockScript,
  runCascadeBounds,
  type CascadeBounds,
  type GraphSnapshot,
  type InterventionAnalysis,
  type ShockScenario,
} from "../../packages/core/src/index";
import { Status } from "../components/status";
import type { WorkbenchCase } from "./case-data";
import { buildWorkbenchExport } from "./export";
import { importGraphFile, importScenarioFile, starterScenario } from "./imports";

interface WorkbenchProps {
  cases: WorkbenchCase[];
  initialMagnitude?: number;
  initialSlug?: string;
  initialTransmission?: number;
}
interface ActiveData {
  bounds: CascadeBounds;
  interventions: InterventionAnalysis;
  origin: "reviewed" | "user";
  scenario: ShockScenario;
  slug: string;
  snapshot: GraphSnapshot;
}

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
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
  const [active, setActive] = useState<ActiveData>(() => fromCase(first));
  const [selectedSlug, setSelectedSlug] = useState(first.slug);
  const [magnitude, setMagnitude] = useState(
    bounded(initialMagnitude ?? first.scenario.shocks[0].magnitude, 0, 1),
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

  const originalMagnitude = active.scenario.shocks[0].magnitude;
  const originalTransmission = active.scenario.propagation.transmission;
  const magnitudeLabel =
    active.scenario.shocks[0].operation === "multiply_capacity"
      ? "Capacity multiplier"
      : "Shock magnitude";
  const magnitudeHelp =
    active.scenario.shocks[0].operation === "multiply_capacity"
      ? "Remaining share of capacity after the stress; lower values are more severe."
      : "Bounded magnitude of the primary stress operation.";

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
      const [nextBounds, nextInterventions] = await compute(active.snapshot, activeScenario);
      setBounds(nextBounds);
      setInterventions(nextInterventions);
      if (active.origin === "reviewed") {
        const parameters = new URLSearchParams(window.location.search);
        parameters.set("case", active.slug);
        parameters.set("magnitude", magnitude.toFixed(2));
        parameters.set("transmission", transmission.toFixed(2));
        window.history.replaceState(null, "", `${window.location.pathname}?${parameters}`);
      }
      setMessage(
        active.origin === "reviewed"
          ? "Run complete. URL state updated; outputs remain scenario-only."
          : "Run complete locally. Imported data were not uploaded; outputs remain scenario-only.",
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

  function download() {
    const artifact = buildWorkbenchExport({
      scenario: activeScenario,
      snapshot: active.snapshot,
      bounds,
      interventions,
    });
    const url = URL.createObjectURL(new Blob([artifact.text], { type: artifact.mediaType }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = artifact.filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setShowGitHub(true);
    setMessage("Analysis downloaded. Use the Python CLI to create a recomputation-verifiable RiskPack.");
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
            <b>{magnitudeLabel}</b>
            <input
              aria-label={`${magnitudeLabel} value`}
              className="numeric-input"
              max="1"
              min="0"
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) setMagnitude(bounded(value, 0, 1));
              }}
              step="0.01"
              type="number"
              value={magnitude}
            />
          </span>
          <input
            aria-label={`${magnitudeLabel} slider`}
            aria-describedby="magnitude-help"
            max="1"
            min="0"
            onChange={(event) => setMagnitude(Number(event.target.value))}
            step="0.01"
            type="range"
            value={magnitude}
          />
          <small id="magnitude-help">{magnitudeHelp}</small>
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
                if (Number.isFinite(value)) setTransmission(bounded(value, 0, 1));
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
            onChange={(event) => setTransmission(Number(event.target.value))}
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

        <div className="workbench-disclaimer">
          Lower and central results can exclude imported or model-inferred dependency edges. Upper results add those assumed links. Values are dimensionless stress indices; gaps between bounds show evidence eligibility, not statistical confidence.
        </div>
      </section>
    </div>
  );
}
