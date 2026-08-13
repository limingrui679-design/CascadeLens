# Schema compatibility and migration

CascadeLens uses explicit semantic versions for WorldGraph, ShockScript, engine output, and RiskPack manifests.

## Compatibility policy

- Patch releases may tighten validation only when the rejected input was already outside the documented contract.
- Minor releases may add optional fields or new registered enum values; consumers must ignore only fields that their chosen schema explicitly permits.
- Major releases may change required fields or semantics and require an explicit migration.
- A loader never guesses how to reinterpret an unsupported version.
- RiskPacks retain the original schema and engine versions; migration creates a new pack and never mutates the original evidence artifact.

## Current migration registry

Version `0.1.0` is the initial format. There are no prior migrations. An unsupported version returns a validation error and must not be silently coerced.
