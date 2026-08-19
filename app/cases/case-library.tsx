"use client";

import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import capabilityMatrix from "@/content/cases/capability-matrix.json";
import { Status } from "../components/status";

export interface CaseRecord {
  slug: string;
  title: string;
  domain: string;
  classification: string;
  summary: string;
  tags: string[];
  scoringStatus: string;
  totalWeightedImpact: { lower: number; central: number; upper: number };
  recommendationStatus: string;
  decisionProfile: {
    decisionOwner: string;
    stakeholders: string[];
    capabilities: string[];
    methods: string[];
  };
}

export function CaseLibrary({ cases }: { cases: CaseRecord[] }) {
  const [query, setQuery] = useState("");
  const [classification, setClassification] = useState("all");
  const [capability, setCapability] = useState("all");
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return cases.filter(
      (item) =>
        (classification === "all" || item.classification === classification) &&
        (capability === "all" || item.decisionProfile.capabilities.includes(capability)) &&
        (!normalized ||
          [
            item.title,
            item.domain,
            item.summary,
            item.decisionProfile.decisionOwner,
            ...item.tags,
            ...item.decisionProfile.capabilities,
            ...item.decisionProfile.methods,
            ...item.decisionProfile.stakeholders,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalized)),
    );
  }, [capability, cases, classification, query]);

  return (
    <>
      <div className="library-toolbar">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search reference cases</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search domain or stress…"
            type="search"
            value={query}
          />
        </label>
        <label className="select-field">
          <span>Classification</span>
          <select value={classification} onChange={(event) => setClassification(event.target.value)}>
            <option value="all">All cases</option>
            <option value="quasi_historical">Quasi-historical</option>
            <option value="synthetic_stress">Synthetic stress</option>
          </select>
        </label>
        <label className="select-field">
          <span>Capability</span>
          <select value={capability} onChange={(event) => setCapability(event.target.value)}>
            <option value="all">All capabilities</option>
            {capabilityMatrix.capabilities.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
        </label>
        <p aria-live="polite" className="result-count">{visible.length} of {cases.length}</p>
      </div>
      <div className="case-grid">
        {visible.map((item, index) => (
          <article className="case-card" key={item.slug}>
            <div className="case-card-top">
              <span className="case-number">{String(index + 1).padStart(2, "0")}</span>
              <Status tone="scenario">scenario only</Status>
            </div>
            <p className="case-domain">{item.domain}</p>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <div className="mini-bounds" aria-label="Generated impact bounds">
              <span>L {item.totalWeightedImpact.lower.toFixed(3)}</span>
              <span>C {item.totalWeightedImpact.central.toFixed(3)}</span>
              <span>U {item.totalWeightedImpact.upper.toFixed(3)}</span>
            </div>
            <div className="tag-row">
              {item.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="capability-row" aria-label="Primary capability tasks">
              {item.decisionProfile.capabilities.slice(0, 3).map((itemCapability) => (
                <span key={itemCapability}>{itemCapability.replaceAll("-", " ")}</span>
              ))}
            </div>
            <Link className="text-link" href={`/cases/${item.slug}`}>
              Inspect evidence trail <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
      {visible.length === 0 ? <p className="empty-state">No reference case matches those filters.</p> : null}
    </>
  );
}
