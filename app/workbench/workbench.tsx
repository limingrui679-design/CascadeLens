"use client";

import { Download, Link2, Play, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import {
  analyzeInterventions,
  runCascadeBounds,
  type CascadeBounds,
  type GraphSnapshot,
  type InterventionAnalysis,
  type ShockScenario,
} from "../../packages/core/src/index";
import { Status } from "../components/status";
import { buildWorkbenchExport } from "./export";

interface WorkbenchProps {
  snapshot: GraphSnapshot;
  scenario: ShockScenario;
  initialBounds: CascadeBounds;
  initialInterventions: InterventionAnalysis;
  initialMagnitude?: number;
  initialTransmission?: number;
}

function bounded(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function Workbench({
  snapshot,
  scenario,
  initialBounds,
  initialInterventions,
  initialMagnitude,
  initialTransmission,
}: WorkbenchProps) {
  const originalMagnitude = scenario.shocks[0].magnitude;
  const originalTransmission = scenario.propagation.transmission;
  const magnitudeLabel =
    scenario.shocks[0].operation === "multiply_capacity"
      ? "Capacity multiplier"
      : "Shock magnitude";
  const magnitudeHelp =
    scenario.shocks[0].operation === "multiply_capacity"
      ? "Remaining share of capacity after the stress; lower values are more severe."
      : "Bounded magnitude of the primary stress operation.";
  const [magnitude, setMagnitude] = useState(
    bounded(initialMagnitude ?? originalMagnitude, 0, 1),
  );
  const [transmission, setTransmission] = useState(
    bounded(initialTransmission ?? originalTransmission, 0, 1),
  );
  const [bounds, setBounds] = useState(initialBounds);
  const [interventions, setInterventions] = useState(initialInterventions);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("Verified precomputed result loaded.");

  const activeScenario = useMemo<ShockScenario>(
    () => ({
      ...scenario,
      shocks: scenario.shocks.map((shock, index) =>
        index === 0 ? { ...shock, magnitude } : shock,
      ),
      propagation: { ...scenario.propagation, transmission },
    }),
    [magnitude, scenario, transmission],
  );

  async function run() {
    setRunning(true);
    setMessage("Running deterministic bounds and exhaustive feasible bundles…");
    try {
      const [nextBounds, nextInterventions] = await Promise.all([
        runCascadeBounds(snapshot, activeScenario),
        analyzeInterventions(snapshot, activeScenario),
      ]);
      setBounds(nextBounds);
      setInterventions(nextInterventions);
      const parameters = new URLSearchParams(window.location.search);
      parameters.set("magnitude", magnitude.toFixed(2));
      parameters.set("transmission", transmission.toFixed(2));
      window.history.replaceState(null, "", `${window.location.pathname}?${parameters}`);
      setMessage("Run complete. URL state updated; outputs remain scenario-only.");
    } catch (error) {
      setMessage(error instanceof Error ? `Run blocked: ${error.message}` : "Run blocked.");
    } finally {
      setRunning(false);
    }
  }

  function reset() {
    setMagnitude(originalMagnitude);
    setTransmission(originalTransmission);
    setBounds(initialBounds);
    setInterventions(initialInterventions);
    window.history.replaceState(null, "", window.location.pathname);
    setMessage("Verified precomputed result restored.");
  }

  async function share() {
    const parameters = new URLSearchParams({
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
      snapshot,
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
    setMessage("Scenario analysis downloaded. Use the full RiskPack for independent provenance verification.");
  }

  const recommended = interventions.recommendedBundleIds
    .map((id) => scenario.interventions.find((item) => item.id === id)?.label ?? id);

  return (
    <div className="workbench-layout">
      <aside className="workbench-controls" aria-label="Scenario controls">
        <div className="control-head">
          <div>
            <p className="micro-label">ShockScript · {scenario.schemaVersion}</p>
            <h2>{scenario.title}</h2>
          </div>
          <Status tone="scenario">scenario only</Status>
        </div>
        <div className="boundary-warning">
          All topology and numeric parameters are declared assumptions. This run is not historically scored.
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
            <div><dt>Decision cutoff</dt><dd>{scenario.decisionCutoff.slice(0, 10)}</dd></div>
            <div><dt>Horizon</dt><dd>{Math.max(...scenario.propagation.horizonsDays)} days</dd></div>
            <div><dt>Graph</dt><dd>{snapshot.nodes.length} nodes / {snapshot.edges.length} edges</dd></div>
            <div><dt>Engine</dt><dd>{scenario.propagation.engine}</dd></div>
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
              <i style={{ width: `${result.totalWeightedImpact * 100}%` }} aria-hidden="true" />
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
              The numerically lowest upper-bound bundle is not promoted to an operational recommendation because its intervention effects are model assumptions.
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
                const node = snapshot.nodes.find((item) => item.id === impact.nodeId);
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
          Lower and central results include the directly shocked constructed node but exclude all model-inferred dependency edges. Upper results add those assumed links. The headline is a time-weighted mean; node rows also show within-horizon peak and final-day impact. Values are dimensionless stress indices.
        </div>
      </section>
    </div>
  );
}
