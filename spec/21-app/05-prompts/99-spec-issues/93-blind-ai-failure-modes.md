# 93 — Blind-AI Failure Modes (Concrete Scenarios)

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

What actually breaks when a blind AI tries to implement the subsystem from `spec/21-app/05-prompts/` alone.

## Scenario 1 — "Implement the schema validator"
- AI reads `READINESS-SCORE.md` row 4 → cited evidence `json/00`–`09`.
- AI runs `ls spec/21-app/05-prompts/macros/json/` → **directory not found** (C29).
- AI falls back to `folder-layout/02-schema-reference.md` (not advertised anywhere) → may miss it.
- **Outcome:** validator written against guessed shape; round-trip fails (C38).

## Scenario 2 — "Resolve a `${UserName}` placeholder"
- AI greps for placeholder syntax: hits `examples/03` + `guards/04`.
- Guard says "prevent injection" but doesn't declare canonical syntax (C45).
- AI tries `mem://features/prompt-variables` → **file missing** (C67).
- **Outcome:** AI picks `{{var}}` OR `${var}` at random; runtime template engine throws.

## Scenario 3 — "Halt a runaway loop"
- AI reads `guards/01-loop-safety.md` → "three layers" mentioned, NO thresholds (C42).
- AI reads CHANGELOG → cites `per-step 60s, total 30m, loop 25` (C72) but no spec doc backs it.
- **Outcome:** AI invents thresholds; either burns credits (too lax) or aborts valid runs (too strict).

## Scenario 4 — "Write a failure-log entry"
- AI reads `observability/02-failure-log-schema.md` → restates Core memory but `Reason` enum not inlined (C53).
- AI reads `macros/05-failure-modes.md` → free-prose Reason names, no table (C62).
- AI greps Core memory for `Reason` codes → finds `JsThrew`, `SelectorMiss`, etc., but no authoritative complete enum.
- **Outcome:** AI emits ad-hoc Reason strings; downstream UI panel + webhook validator reject them.

## Scenario 5 — "Migrate a legacy prompt"
- AI follows `MIGRATION.md` step 1 (move file) — OK.
- Step 2 (add `info.json`) — schema not inlined, `json/` folder missing (C29, C71).
- **Outcome:** AI guesses field names; CI guards `DuplicateMacroSlug`/`SlugFolderMismatch` cited but their implementation files unlinked → AI cannot run them.

## Scenario 6 — "Stop writing outside audit root"
- AI reads `guards/00-forbidden-writes.md` — deny-list source unlinked (C41).
- AI reads `macros/07-permissions-and-scope.md` — no permission matrix (C64).
- **Outcome:** AI writes to `skipped/` or `.release/` (violates Core memory `mem://constraints/skipped-folders`).

## Scenario 7 — "Render the error UI"
- AI reads `observability/04-ui-error-surface.md` → references `ui/` (missing, C29) for component taxonomy.
- **Outcome:** No UI built, or built with wrong slot.

## Common failure-pattern summary
| Pattern | Frequency | Categories |
|---|---:|---|
| Cited file/folder doesn't exist | 7+ | C29, C66, C67 |
| Enum referenced but not enumerated | 5+ | C27, C42, C45, C53 |
| Threshold/constant mentioned without value | 4+ | C7, C42, C61 |
| Memory drift (parallel docs disagree) | 6+ | C10, C26, C53, C63, C68 |
| Test path implied but absent | most | C28 |

**Net:** 7/7 representative blind-AI tasks fail at the spec layer — independent of code quality. The subsystem is **NOT** implementation-ready.
