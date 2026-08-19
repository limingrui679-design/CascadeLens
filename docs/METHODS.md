# Methods and failure conditions

CascadeLens is a deterministic scenario compiler for evidence-graded dependency graphs. This document specifies the implemented mathematics, its relationship to common cascade models, and the conditions under which the software must stop or remain `scenario_only`.

## Scope

The engine answers a bounded conditional question:

> Given this frozen graph, these declared shocks, these evidence rules, and these intervention assumptions, what stress envelope follows?

It does not estimate causal structure, learn weights, calibrate probabilities, or forecast realized losses.

## Inputs

| Input | Role | Guardrail |
|---|---|---|
| WorldGraph | Nodes, directed relations, weights, sources | Content-addressed and bitemporal |
| ShockScript | Targets, operations, timing, horizons | Versioned and validated |
| Evidence grade | Edge eligibility by bound | No confidence-based promotion |
| Intervention set | Cost, lead time, effect, constraints | Exhaustively enumerated up to 16 items |
| Outcome partition | Optional post-event comparison | Kept outside frozen inputs |

Every run uses a decision cutoff. A record is visible on day \(t\) only when it is both valid on \(t\) and knowable at the cutoff.

## Evidence bounds

| Grade | Lower | Central | Upper |
|---|:---:|:---:|:---:|
| Official observed | ✓ | ✓ | ✓ |
| Entity reported | ✓ | ✓ | ✓ |
| Third-party verified | — | ✓ | ✓ |
| Text extracted | — | — | ✓ |
| Model inferred | — | — | ✓ |

These are missing-graph bounds, not statistical confidence intervals. If all dependencies are inferred, lower and central results can contain only direct shocks while the upper bound propagates across assumed links.

## Daily cascade

For node \(i\), direct active shocks are combined without simple addition:

\[
d_i(t)=1-\prod_{s\in S_i(t)}(1-s)
\]

For an eligible incoming edge \(j\rightarrow i\), contribution is:

\[
c_{ji}(t)=\operatorname{clip}\left(x_j(t)\,w_{ji}^{(b)}\,\tau,0,1\right)
\]

where \(b\) is lower, central, or upper; \(w_{ji}^{(b)}\) is that edge's bounded weight; and \(\tau\) is the declared transmission parameter.

Incoming contributions are combined as:

\[
p_i(t)=1-\prod_j(1-c_{ji}(t))
\]

After the node buffer \(q_i(t)\), the daily state is:

\[
x_i(t)=1-(1-d_i(t))\left(1-(1-q_i(t))p_i(t)\right)
\]

A directed acyclic visible graph is solved exactly in topological order. A cyclic graph uses fixed-point iteration until the declared tolerance or iteration limit is reached. Failure to converge is retained in the result and warnings.

## Horizon summaries

For a horizon of \(H\) simulated days, each node reports:

- time-weighted mean: \(H^{-1}\sum_t x_i(t)\);
- peak: \(\max_t x_i(t)\);
- final state: \(x_i(H)\);
- mean direct component and peak direct component;
- the largest edge contributions at the peak.

The graph headline is a criticality-weighted mean. Criticality is a declared input, not an estimated welfare or monetary value.

## Interventions

CascadeLens enumerates every subset of at most 16 interventions. A bundle is infeasible when it violates budget, count, lead-time, unit, or mutual-exclusion constraints. Effects activate at:

\[
t_{activate}=t_{cutoff}+\text{leadTimeDays}
\]

An effect reduces the relevant node or edge contribution multiplicatively. The Pareto frontier retains bundles for which no other feasible bundle has both lower cost and lower upper-bound impact. If any selected effect lacks primary-grade support, output remains `evidence_required` rather than becoming an operational recommendation.

## Replay scoring

Historical scoring requires a predeclared metric, horizon, complete result window, post-window availability, and an outcome-only source partition. When eligible outcomes exist, the implementation reports sample size, mean absolute error, rank correlation, interval coverage and width, direction accuracy, calibration error, and regret against a zero-impact baseline.

The 16 published reference cases have no separated outcome set and therefore return `scenario_only`.

## Parameter sensitivity surface

The Workbench recomputes a deterministic 5 × 5 grid over normalized primary-shock severity and propagation transmission. Operation-specific magnitudes are mapped to a common severity scale: capacity multipliers use one minus remaining capacity, demand increases use the engine's bounded demand-pressure transform, and already proportional operations use their bounded magnitude. Because `disable` is binary, sensitivity cells represent a disclosed partial-capacity proxy; the reviewed base run remains a binary disable. Every cell is a complete upper missing-graph-bound run at the displayed parameter pair. The surface is a robustness diagnostic: grid levels are not probabilities, the result is not a posterior distribution, and variation across cells is not statistical uncertainty.

## Baseline relationships

| Model family | Relationship to CascadeLens | Current comparison status |
|---|---|---|
| Zero-propagation baseline | Direct shocks only | Implemented implicitly by lower/central exclusion when no eligible edges exist |
| Linear input-output propagation | Weighted directed transmission | Related, but CascadeLens uses bounded nonlinear combination and daily visibility |
| Independent cascade | Edge-mediated activation | Related conceptually; CascadeLens propagates continuous stress rather than Bernoulli activation |
| Linear threshold | Aggregated neighbor pressure | Related conceptually; no learned or empirical activation threshold is claimed |
| Fixed-point network stress | Cyclic equilibrium iteration | Implemented for visible cyclic graphs with an explicit convergence gate |

Published comparisons are methodological context, not evidence that CascadeLens is superior. A future baseline study must register datasets, metrics, exclusions, and failures before running comparisons.

## Python–browser parity

The Python package is the canonical local-analysis entry point. Automated parity tests execute all 16 published graphs and ShockScripts and compare lower, central, upper, and intervention outputs with the reviewed browser artifacts to numerical tolerance. This establishes implementation agreement on those fixtures, not method correctness in a real domain.

## Failure conditions

Analysis blocks or weakens its status when any of the following occurs:

- snapshot digest, checksum, schema, source, or identifier is invalid;
- a scenario references another snapshot or decision cutoff;
- an input was unavailable at the frozen cutoff;
- an outcome source leaks into graph or shock inputs;
- target nodes or edges do not exist;
- a bounded weight or confidence is outside its contract;
- a cyclic daily solve misses its tolerance;
- no comparable post-event outcomes exist;
- a decision depends on unverified intervention effects;
- imported data have unknown license or evidence status.

## What verification proves

RiskPack verification checks paths, file sets, checksums, contracts, the snapshot digest, and deterministic recomputation of bounds, interventions, and benchmark status. It does not prove data publisher identity, causal structure, empirical accuracy, independent review, adoption, or realized impact.

See [External validation protocol](EXTERNAL_VALIDATION_PROTOCOL.md) for the evidence required to strengthen those claims.
