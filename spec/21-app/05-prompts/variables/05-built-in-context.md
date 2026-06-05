# Built-in Run Context

**Created:** 2026-06-02 ()

Tier 3 of the resolution waterfall is the **run context** — a fixed set of
engine-managed variables every macro can reference without declaring them.
They are **reserved**: a prompt or macro that declares a variable with one
of these names fails schema validation with `Reason="ReservedVariable"`.

## Table

| Name          | Type    | When set                              | Value                                                       |
|---------------|---------|---------------------------------------|-------------------------------------------------------------|
| `RunId`       | string  | `RunStarted`                          | `<macroSlug>-<yyyymmdd>-<HHmmss>` ()       |
| `Now`         | string  | re-computed at every step             | ISO 8601 with `+08:00` offset, second precision             |
| `LoopCount`   | integer | `RunStarted = 0`; incremented on every `loop-if` match | current loop iteration (0 on first pass) |
| `LastScore`   | integer | `null` until first `audit` / `final-audit` succeeds | most recent parsed score, 0–100         |
| `TargetScore` | integer | `RunStarted`                          | from `Macro.TargetScore` (default 100)                      |
| `MaxLoops`    | integer | `RunStarted`                          | from `Macro.MaxLoops` (default 3)                           |
| `MacroSlug`   | string  | `RunStarted`                          | the macro's `Slug`                                          |
| `Status`      | string  | re-computed at every step             | `"Running"` / `"Paused"` / `"Looping"`                      |

## Fixity guarantees

| Variable        | Stable across the whole run? | Stable across resume? |
|-----------------|------------------------------|-----------------------|
| `RunId`         | ✅ yes                       | ✅ yes                |
| `MacroSlug`     | ✅ yes                       | ✅ yes                |
| `TargetScore`   | ✅ yes                       | ✅ yes                |
| `MaxLoops`      | ✅ yes                       | ✅ yes                |
| `LoopCount`     | mutates monotonically        | ✅ restored from `MacroRunState` |
| `LastScore`     | mutates                      | ✅ restored           |
| `Status`        | mutates                      | ✅ restored           |
| `Now`           | mutates every step           | re-computed (never persisted) |

## `Now` precision and timezone

- Format: `YYYY-MM-DDTHH:mm:ss±HH:MM` (ISO 8601 with explicit offset).
- Timezone: **** (`mem://localization/timezone`),
  always `+08:00`.
- Re-computed at the start of each step's render pass — two placeholders in
  the same body see the same value, but a later step may see a later value.

## `LastScore` semantics

- Initial value: `null`.
- After every successful `audit` / `final-audit` step: replaced by the newly
  parsed integer (0–100).
- A failed parse (`ScoreParseFailed`) does NOT overwrite `LastScore`.
- When referenced as `{{ LastScore }}` while still `null`, the placeholder
  renders as the literal string `"null"` (no fail-fast — this lets prompts
  detect the "no audit yet" condition).

## Worked references

```md
Run {{ RunId }} (macro {{ MacroSlug }}, loop {{ LoopCount }}/{{ MaxLoops }},
last score {{ LastScore }}/{{ TargetScore }}) — generated at {{ Now }}.
```

Renders (loop 2 of 3, last score 87):

```
Run spec-tighten-cycle-20260602-094312 (macro spec-tighten-cycle, loop 2/3,
last score 87/100) — generated at 2026-06-02T09:51:18+08:00.
```

## Forbidden additions

The set above is **closed**. New built-ins require:

1. A spec edit to this file.
2. A new entry in `02-declaration.md`'s reserved-names list.
3. A migration note in `json/06-versioning-and-migration.md` (Task 57).

Engine code that introduces an undocumented context variable is treated as a
spec violation by the CI guard in Block 9.
