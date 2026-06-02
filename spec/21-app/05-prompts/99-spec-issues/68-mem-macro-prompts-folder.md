# Audit — mem://architecture/macro-prompts-folder

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur) · 45 lines · EXISTS

## Findings
- **GOOD** Only one of the 3 memory references that actually exists.
- **C8 Drift hazard** — describes `standalone-scripts/macro-prompts/<slug>/` layout but spec subfolder `macros/macro-prompts/` (C29) DOES NOT EXIST. Memory says one location; would-be spec says another. Which is canonical?
- **C26 Authority overlap** — `folder-layout/` (5 spec docs, 349 lines) covers similar ground without `Supersedes:` chain.
- **C27** Aggregator pipeline mentioned ("13-stage"); stages not enumerated in the memory body.
- **C28** No test pointer for the aggregator.

## Severity
High. Layout drift between memory + spec = AI generates files in the wrong root.

## Fix order
1. Declare canonical owner (recommend memory for code path, `folder-layout/` for spec contract).
2. Add `Mirrors:` cross-ref in both directions.
3. Inline 13-stage aggregator enumeration.
4. Reconcile with C29 (drop planned `macros/macro-prompts/` or have memory point at it).
