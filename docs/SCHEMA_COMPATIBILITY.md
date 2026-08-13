# Schema compatibility and migration

CascadeLens uses explicit semantic versions for WorldGraph, ShockScript, engine output, RiskPack manifests, assumption registers, model cards, and RiskPack limitations.

## Compatibility policy

- Patch releases may tighten validation only when the rejected input was already outside the documented contract.
- Minor releases may add optional fields or new registered enum values; consumers must ignore only fields that their chosen schema explicitly permits.
- Major releases may change required fields or semantics and require an explicit migration.
- A loader never guesses how to reinterpret an unsupported version.
- RiskPacks retain the original schema and engine versions; migration creates a new pack and never mutates the original evidence artifact.

## Current migration registry

Schema version `0.1.0` remains the initial WorldGraph, ShockScript, and RiskPack-manifest format. Engine version `0.2.0` changes derived-result semantics while continuing to serialize through those schemas. CascadeLens `v0.3.0` introduced assumption-register, model-card, and limitations schemas at `1.0.0`; `v0.3.1` retains those contracts while hardening release-build cleanup. The required semantic-binding fields intentionally reject legacy metadata that could not be cross-checked. Runtime verification requires the exact engine and metadata versions declared by the current release. An older RiskPack remains an immutable historical artifact and must be verified with its matching release; unsupported versions are never silently coerced.
