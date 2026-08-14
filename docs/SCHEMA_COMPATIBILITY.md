# Schema compatibility and migration

CascadeLens uses explicit semantic versions for WorldGraph, ShockScript, engine output, RiskPack manifests, assumption registers, model cards, and RiskPack limitations.

## Compatibility policy

- Patch releases may tighten validation only when the rejected input was already outside the documented contract.
- Minor releases may add optional fields or new registered enum values; consumers must ignore only fields that their chosen schema explicitly permits.
- Major releases may change required fields or semantics and require an explicit migration.
- A loader never guesses how to reinterpret an unsupported version.
- RiskPacks retain the original schema and engine versions; migration creates a new pack and never mutates the original evidence artifact.

## Current migration registry

Schema version `0.1.0` remains the initial WorldGraph, ShockScript, and RiskPack-manifest format. Engine version `0.2.0` changes derived-result semantics while continuing to serialize through those schemas. CascadeLens `v0.3.0` introduced assumption-register, model-card, and limitations schemas at `1.0.0`; `v0.3.1` hardened release-build cleanup; and `v0.3.2` retained those contracts while adding GitHub-enforced release immutability. Release `v0.4.0` adds a Python 3.11+ implementation, CLI, and import adapters without changing those serialized contracts or engine semantics; parity tests bind it to all 12 reviewed artifacts. Release `v0.5.0` adds an optional connector-specific WorldGraph mapping hook, the BEA sector mapping, and an evidence-ledger contract without changing the WorldGraph, ShockScript, RiskPack, or engine versions. Release `v0.5.1` changes the public workflow presentation and release identity without changing any serialized contract or engine behavior. The required semantic-binding fields intentionally reject legacy metadata that could not be cross-checked. Runtime verification requires the exact engine and metadata versions declared by the current release. An older RiskPack remains a historical artifact and must be verified with its matching release; unsupported versions are never silently coerced.
