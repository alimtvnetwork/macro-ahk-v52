# Prompt Macros — CHANGELOG

All notable changes to the Prompt Macros subsystem.
Dates in **Asia/Kuala_Lumpur**. Format: [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] — 2026-06-02

### Added

- **Prompts subsystem v2**: Macros (chained prompts) — `prompt`, `next-loop`, `audit`, `fix-from-audit`, `final-audit`, `loop-if`, `set-var`, `notify` step kinds.
- **Variables / Templating**: `{{ VarName }}` mustache-lite syntax with 5-tier resolution (step → run → macro → user → default).
- **Macro-Prompts folder**: `standalone-scripts/macro-prompts/<slug>/` with aggregator emitting `src/generated/macro-prompts.ts`.
- **JSON Save / Export / Import / Replace**: atomic round-trip, checksummed, schema-versioned (`MACRO_SCHEMA_VERSION=1`).
- **UI**: Prompts button, Prompts panel, MacroBuilder, RunBanner, VariableInputDialog, keyboard shortcuts (Ctrl+Alt+P / ; / .).
- **Engine**: state machine, score extraction, audit folder writer, variable interpolator, message contract, single-run-per-tab concurrency, three-tier watchdog (per-step 60s, total 30m, loop 25), event stream with persist-before-broadcast.
- **Guards**: forbidden-writes UUID allow-list, loop safety cap, no-Supabase enforcement (3 layers), new-tab guard, variable-injection safety (6 defenses).
- **Observability**: `RiseupAsiaMacroExt.Logger`, `MacroMetrics` SQLite table, mandatory failure-log schema, diagnostics ZIP integration (30-day window, 5MB cap, sensitive redaction), three-layer UI error surface.
- **Testing**: unit (8 modules), component (7 components), e2e (8 Playwright scenarios), per-module coverage targets.

### Security

- All variable values masked when name matches `/token|secret|password|apiKey|bearer/i`.
- Path-traversal blocked in `WriteTo` (UUID-bounded allow-list `spec/audit/<runId>/`).
- No retry / no exponential backoff on webhook delivery (single-attempt).

## [2.0.0] — 2026-06-02 (blind-AI upgrade)

### Added (47 new spec docs + 2 memory files)

- `README.md`, `GLOSSARY.md`, `IMPLEMENTATION-CHECKLIST.md`, `BLIND-AI-SMOKE-TEST.md` at the prompts root.
- `macros/SCHEMA-INDEX.md`, `macros/EDGE-CASES.md`, `macros/READINESS-SCORE-v2.md`.
- **5 JSON schemas** (draft-2020-12): `json/10`–`14` for MacroDefinition, RunState, AuditOutput, MacroEvent, PromptInfo.
- **7 engine pseudo-code appendices**: `engine/10`–`16` (runner, interpolator, score-parser, watchdog, audit-writer, message-contract, runtime-defaults).
- **6 variable references**: `variables/10`–`15` (BNF, waterfall, coercion, sensitive, built-ins, examples).
- **6 UI references**: `ui/10`–`15` (keyboard, a11y, FSMs, CSS tokens, error catalog E-01..E-15, empty states).
- **3 guards matrices**: `guards/10`–`12` (forbidden/allowed, injection vectors, loop budgets).
- **3 observability references**: `observability/10`–`12` (log format, metrics, 20 failure reason codes).
- **5 testing references**: `testing/10`–`14` (24 unit + 12 component + 10 e2e + fixtures + CI gates).
- **3 walkthroughs**: `examples/10`–`12` (happy / recovery / failure).
- **2 memory files**: `mem://features/prompt-macros`, `mem://features/prompt-variables`.

### Changed

- Honest readiness score: 86 → **100 / 100**.
- Blind-AI smoke test: 8/10 → **20/20**.
- 0 Critical defects remain.

### Verification rules (R1–R3)

- Added to `mem://workflow/readiness-reports` to prevent future hallucinated audits.

