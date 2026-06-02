# MIGRATION Template — Spec MAJOR vN → vN+1

Status: Template · v1.0.0 · 2026-06-02

Copy this file to `macros/MIGRATION-vN-to-vNplus1.md` on every MAJOR bump.
Keep `macros/MIGRATION.md` as the canonical latest pointer.

---

## Summary
One paragraph: why this MAJOR exists, what breaks, what doesn't.

## Breaking changes
| ID | Area | Before | After | Action required |
|----|------|--------|-------|-----------------|
| B-01 | json/10 | field `foo` optional | `foo` required | Add `foo` to all macros |
| B-02 | StepKindId | (none removed; IDs are immutable) | — | — |

## Non-breaking additions
- New StepKindId N — see macros/01.
- New schema field `bar` (default provided) — see json/10.

## What did NOT change
- `chrome.storage.local` key shapes (mem://constraints/no-storage-pascalcase-migration)
- 5-tier variable waterfall (variables/11)
- MacroEvent discriminant strings (engine/15)
- Score regex (engine/12)

## Step-by-step migration
1. Bump spec version + CHANGELOG entry.
2. Run `scripts/spec/build-index.mjs`.
3. For each repository consumer: run codemod `scripts/migrate/vN-to-vNplus1.mjs`.
4. Re-run smoke (`scripts/spec/smoke-rescore.mjs`) — must remain 20/20.
5. Tag `spec-v<N+1>.0.0`.

## Rollback
Revert tag; restore previous schemas from git history. No data migration required (additive-only fields default-safe).

## Before / After sample
```json
// Before
{ "id": "m1", "steps": [ ... ] }
// After
{ "id": "m1", "specVersion": "<N+1>.0.0", "steps": [ ... ], "foo": "..." }
```

## Deprecation timeline
- Announced: spec vN.X.0
- Soft window: ≥ 2 MINOR releases (governance/10)
- Removed: spec v<N+1>.0.0 (this release)
