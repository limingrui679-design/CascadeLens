# Prospective external validation protocol

This document defines evidence that could strengthen CascadeLens later. It does not claim that any external validation, historical replay, user study, or adoption has occurred.

## Historical replay gate

1. Register the target metric, horizon, case inclusion rule, decision cutoff, and failure criteria before outcomes are acquired.
2. Freeze and hash every input source, query, availability timestamp, graph mapping, ShockScript, engine version, and RiskPack expected digest.
3. Store outcomes under outcome-only sources with event windows and publisher availability later than the target horizon.
4. Retain every eligible case, including blocked runs and failures, in the denominator.
5. Report sample size, MAE, rank correlation where defined, interval coverage and width, directional accuracy, calibration error, regret, and subgroup failures. Do not report a single favorable metric alone.

## Independent review gate

An external report must name the reviewer, relevant expertise, review scope, date, tested commit/tag, conflicts of interest, exact commands or method, findings, and issue-resolution links. A maintainer review, automated score, or reviewer selected without a conflict statement does not satisfy this gate.

## Usability or adoption gate

A structured usability result must define participants, tasks, consent/privacy handling, failure observations, and complete results. An adoption or impact claim additionally requires an identifiable counterparty, documented scope and dates, and evidence that the product informed a real task. A public URL, page view, repository clone, or private preview is not adoption.

## Publication rule

External evidence must be preserved as a dated, immutable artifact or stable public link. Product labels and application materials may change only after a claim-to-evidence review confirms that the new evidence supports the exact wording.
