# Audit — CHANGELOG.md vs Actual Artifacts

**Audited:** 2026-06-02 (Asia/Kuala_Lumpur) · 24 lines · single entry `[1.0.0] — 2026-06-02`

## Falsification table

| CHANGELOG claim | Actual evidence | Verdict |
|---|---|---|
| "Macros — `prompt`, `next-loop`, `audit`, `fix-from-audit`, `final-audit`, `loop-if`, `set-var`, `notify` step kinds" (8) | `engine/01-state-machine.md` claims 8 kinds; `macros/01-step-kinds.md` exists | Plausible, unverified per-kind |
| "Variables / Templating: `{{ VarName }}` 5-tier resolution" | `mem://features/prompt-variables` **MISSING** (C67); spec `variables/` folder **MISSING** (C29) | **False** — undocumented |
| "JSON Save / Export / Import / Replace … `MACRO_SCHEMA_VERSION=1`" | Schema doc is `folder-layout/02-schema-reference.md`; `MACRO_SCHEMA_VERSION` constant not searchable in spec | Partial |
| "UI: Prompts button … keyboard shortcuts (Ctrl+Alt+P / ; / .)" | `mem://features/recorder-keyboard-shortcuts` defines those bindings for the RECORDER, not Macros — **possible collision** | **Conflict** |
| "Engine … three-tier watchdog (per-step 60s, total 30m, loop 25)" | `guards/01-loop-safety.md` (C42) flagged for NOT enumerating thresholds | **Contradiction** — CHANGELOG has the numbers the guard doesn't |
| "Guards: forbidden-writes UUID allow-list … no-Supabase 3 layers … variable-injection 6 defenses" | `guards/00`–`04` exist; numbers (3 layers, 6 defenses) not in the guard docs | Partial |
| "Testing: unit (8 modules), component (7 components), e2e (8 Playwright scenarios)" | `testing/00`–`04` exist but contain NO concrete file paths (C46–C50); counts unverifiable | **False** — counts fabricated |
| "Security: All variable values masked … `/token\|secret\|password\|apiKey\|bearer/i`" | Mirrors `mem://standards/verbose-logging-and-failure-diagnostics`; not cited in CHANGELOG | Acceptable but uncredited |

## Cross-cutting issues
- **C1** Missing metadata header (Version present in heading, Owner/Updated absent).
- **C8** Keyboard shortcut collision with recorder memory not flagged.
- **C24** No SemVer bump policy declared for future entries.

## Severity
**Critical.** CHANGELOG cites thresholds + counts that don't appear in the spec docs — it's a SUMMARY of work that wasn't fully written. Treat as a TODO list, not a release log.

## Fix order
1. Mark `[1.0.0]` as "Planned" until C29/C66/C67/C42 are resolved.
2. Resolve keyboard-shortcut collision (Macros vs Recorder).
3. Migrate threshold numbers from CHANGELOG INTO `guards/01-loop-safety.md`.
4. Replace fabricated test counts with actual file globs.
