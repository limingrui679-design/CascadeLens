"use client";

import { useState } from "react";
import type { GraphSnapshot } from "../../packages/core/src/index";
import { Status } from "../components/status";

export function GraphExplorer({ snapshot }: { snapshot: GraphSnapshot }) {
  const [selected, setSelected] = useState(snapshot.nodes[0].id);
  const [showInferred, setShowInferred] = useState(true);
  const active = snapshot.nodes.find((item) => item.id === selected) ?? snapshot.nodes[0];
  const visibleEdges = showInferred ? snapshot.edges : [];
  return (
    <div className="graph-explorer">
      <div className="graph-toolbar">
        <div>
          <p className="micro-label">Snapshot digest</p>
          <code>{snapshot.contentDigest.slice(0, 18)}…</code>
        </div>
        <label className="toggle-control">
          <input checked={showInferred} onChange={(event) => setShowInferred(event.target.checked)} type="checkbox" />
          <span>Show model-inferred edges</span>
        </label>
      </div>
      <div className="graph-canvas" role="group" aria-label="Assumed WorldGraph topology">
        <div className="graph-flow" aria-hidden="true">
          {snapshot.nodes.map((node, index) => (
            <div key={node.id}>
              <span className={selected === node.id ? "active" : ""}>{index + 1}</span>
              {index < snapshot.nodes.length - 1 ? <i className={showInferred ? "visible" : ""} /> : null}
            </div>
          ))}
        </div>
        <div className="graph-node-buttons">
          {snapshot.nodes.map((node) => (
            <button
              aria-pressed={selected === node.id}
              className={selected === node.id ? "active" : ""}
              key={node.id}
              onClick={() => setSelected(node.id)}
              type="button"
            >
              <small>{node.kind}</small>
              <b>{node.label}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="graph-detail-grid">
        <article className="panel">
          <p className="micro-label">Selected node</p>
          <h2>{active.label}</h2>
          <div className="page-intro-meta"><Status tone="inferred">model inferred</Status></div>
          <dl className="key-values">
            <div><dt>Kind</dt><dd>{active.kind}</dd></div>
            <div><dt>Valid from</dt><dd>{active.validFrom.slice(0, 10)}</dd></div>
            <div><dt>Known at</dt><dd>{active.observedAt.slice(0, 10)}</dd></div>
            <div><dt>Primary eligible</dt><dd>No</dd></div>
          </dl>
        </article>
        <article className="panel">
          <p className="micro-label">Visible relations</p>
          <ol className="edge-list">
            {visibleEdges.length ? visibleEdges.map((edge) => (
              <li key={edge.id}>
                <span>{snapshot.nodes.find((node) => node.id === edge.from)?.label}</span>
                <b>depends on</b>
                <span>{snapshot.nodes.find((node) => node.id === edge.to)?.label}</span>
                <em>{edge.weight.lower?.toFixed(2)}–{edge.weight.upper?.toFixed(2)}</em>
              </li>
            )) : <li className="empty-edge">All assumed links are hidden. The direct shock remains, but no cascade can traverse the graph.</li>}
          </ol>
        </article>
      </div>
      <p className="graph-caption">
        This explorer renders an explicit research topology, not a map of observed Suez trade flows. The linked official page is stored separately as context-only citation metadata.
      </p>
    </div>
  );
}
