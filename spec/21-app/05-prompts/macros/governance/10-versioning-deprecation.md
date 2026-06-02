# Versioning & Deprecation Policy

Status: Normative · v1.0.0 · 2026-06-02

## SemVer for macro spec
- MAJOR — breaking schema/grammar/StepKindId change
- MINOR — additive (new StepKind, new schema field with default)
- PATCH — docs, clarifications, examples

Current: **2.0.0** (see macros/CHANGELOG.md).

## Deprecation lifecycle
1. **Announce** — mark `@deprecated` in schema (`x-deprecated: true`) + CHANGELOG entry.
2. **Soft window** — ≥ 2 MINOR releases; runtime logs `DEPRECATION` reason (observability/12).
3. **Removal** — only in next MAJOR.

## Compatibility guarantees
- `chrome.storage.local` key shapes are frozen (mem://constraints/no-storage-pascalcase-migration).
- `StepKindId` integers are immutable; new kinds get new IDs only.
- `MacroEvent` discriminant `type` strings are append-only.

## Migration docs
Every MAJOR ships a `MIGRATION.md` with before/after JSON samples (see macros/MIGRATION.md).
