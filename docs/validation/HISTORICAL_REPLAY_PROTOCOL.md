# Historical replay protocol

This is an execution protocol, not a completed replay and not proof of predictive validity.

## Freeze before outcome acquisition

1. Open a historical-replay issue and define one decision question, target proxy, comparable nodes, horizon, materiality threshold, inclusion rule, missing-data policy, and failure rule.
2. Commit the protocol. Record that commit as `protocolCommit` before any outcome artifact is added to the replay branch.
3. Preserve exact cutoff inputs with their source-availability timestamps, queries, bytes, hashes, graph mapping, ShockScript, engine version, and decision cutoff.
4. Run the analysis without an outcome source in the input graph. Seal the prediction RiskPack and expected digest.
5. Acquire the complete outcome window through a distinct `role: outcome` source. Preserve bytes, availability time, license, hash, and the transformation into `observedImpact`.
6. Score every eligible node. Publish blocked runs and missing outcomes in the denominator.

## Required report

The report must include sample size, mean absolute error, Spearman rank, interval coverage and width, coverage-calibration error, direction accuracy, regret versus the zero-impact baseline, exclusions, missingness, leakage audit, and subgroup failures. One favorable metric is not a valid report.

## Candidate public-data path

The BEA annual sector direct-requirements series is a plausible first research candidate because it supplies a stable 15-by-15 relational matrix. It is not yet a valid replay. The current workbook contains multiple years in one artifact and was retrieved after all of them; using a later workbook as if it were available at an earlier cutoff would leak future information. A valid replay therefore needs independently preserved vintage input files or publisher release records proving what was available at the cutoff, plus a separately acquired later outcome artifact and a pre-outcome protocol commit.

## Acceptance gate

A replay increments the public count only when its accepted record identifies one case, a 40-character protocol commit, the cutoff, later outcome availability, at least two comparable observations, `benchmarkStatus: historically_scored`, zero leakage issues, complete metrics, a stable public report, and an exact report hash.

