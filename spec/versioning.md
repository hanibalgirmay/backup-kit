# Versioning

## Config schema

- Current: **v1** (`spec/config.schema.json`)
- Bump when required fields change or semantics break.
- Optional additive fields do not require a major bump; document them here.

## Artifact format

- Current: **formatVersion 1** (see [`artifact.md`](./artifact.md))
- Readers must refuse unknown major format versions.
- Additive optional manifest fields are allowed within the same format version.

## Driver contract

- Current: **v1** (`spec/driver.schema.json`)
- Driver `id` values are stable public identifiers.
- Capability sets may grow; removing a capability is a breaking change.

## Language packages

Each package (`backup-kit` npm, Composer, PyPI, Go module) versions independently with SemVer, but MUST document the supported:

| Package field | Meaning |
| --- | --- |
| `kitVersion` | Runtime release (SemVer) |
| `configVersion` | Max config schema version supported |
| `formatVersion` | Max artifact format version supported |

## Compatibility promise

Until 1.0.0 of a language package:

- Breaking changes may land with minor bumps; changelog MUST call them out.
- After 1.0.0, SemVer applies strictly.
