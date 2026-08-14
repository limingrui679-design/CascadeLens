# CascadeLens v0.5.1 presentation and release review

This maintainer review covers the exact `v0.5.1` release scope. It is internal
software and publication evidence, not an independent method or domain review,
historical validation, user study, organizational adoption, or impact
evaluation.

## Change reviewed

- The root README now opens the RiskPack section with one compact left-to-right
  path: decision question, sealed graph and ShockScript, bounded cascade,
  options and benchmark gate, checksummed RiskPack, and independent
  recomputation.
- The pre-existing complete decision and verification graph remains available
  immediately below in an expandable section. No evidence stage, rejection
  branch, or terminal status was removed.
- Active install examples, package and Python versions, website copy, citation
  metadata, evidence-status copy, issue prompts, and the generated CycloneDX
  SBOM identify `v0.5.1`.

## Required release checks

The release is accepted only after all of the following succeed on its exact
tagged commit:

1. Python compile, unit, CLI demo, and RiskPack recomputation on Python 3.11,
   3.12, and 3.13 in GitHub Actions.
2. The complete `npm run ci` gate, including unit, example, content, evidence,
   documentation, rendered-route, accessibility, security, dependency-audit,
   and performance checks.
3. Network-blocked production builds with identical complete `dist` tree
   digests on Linux and macOS.
4. Detached ZIP and TAR verification without `.git`, including archive budgets,
   source identity, Python execution, artifact regeneration, full web CI, and
   two further offline production builds.
5. Public Release asset redownload and checksum comparison, followed by hosted
   `/build-info.json` verification against the same commit, tree, tag, package
   version, content digests, and `dirty=false` state.

## Evidence boundary

This patch changes presentation and release identity only. The machine evidence
ledger remains authoritative: 0 historically scored cases, 0 external method or
domain reviews, 0 structured usability studies, 0 verified organizational
adoptions, and 0 demonstrated real-world impacts. All 12 public reference cases
remain `scenario_only`.
