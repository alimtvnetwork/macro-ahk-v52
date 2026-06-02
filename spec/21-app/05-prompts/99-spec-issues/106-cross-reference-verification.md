# Cross-Reference Verification (v3)

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Purpose:** prove every cross-doc reference in the 50-step upgrade resolves to a real file with consistent claims.

## 1. Engine ↔ pseudo-code

| Engine doc | Pseudo-code appendix | Drift? |
|---|---|:--:|
| `00-architecture.md` | `10-pseudocode-runner.md` | none — modules and process-boundaries match |
| `01-state-machine.md` | `10-pseudocode-runner.md` (while-loop + status transitions) | none |
| `02-resume-after-sw-restart.md` | `10` rehydration block + `examples/11-recovery-walkthrough.md` | none |
| `03-score-extraction.md` | `12-pseudocode-score-parser.md` | none — same regex `/^\s*Score:\s*(\d{1,3})\s*\/\s*100\s*$/gm` |
| `04-audit-folder-writer.md` | `14-pseudocode-audit-writer.md` | none — same `01/02/99` naming |
| `05-variable-interpolator.md` | `11-pseudocode-interpolator.md` + `variables/11-resolution-waterfall.md` | none — 5-tier order identical |
| `06-message-contract.md` | `15-message-contract-typescript.md` | none — union shape matches |
| `07-concurrency.md` | runtime-defaults `runStateMaxRows`, abort `TabBusy` | none |
| `08-watchdog.md` | `13-pseudocode-watchdog.md` + `engine/16-runtime-defaults.md` | none — budgets identical |
| `09-event-stream.md` | `json/13-event-stream.schema.json` + `15-message-contract-typescript.md` | none — 10 event types match |

## 2. Variables ↔ engine

- Reserved built-in names enumerated in `variables/14-builtin-context-reference.md` match interpolator `ctx.builtIn` reads in `engine/11-pseudocode-interpolator.md`.
- Sensitive masking flow `variables/13-sensitive-patterns.md` → masked at `maskForLog()` in `engine/11`. Verbose gate confirmed not to bypass.

## 3. UI ↔ failure codes

- All 15 codes in `ui/14-error-surface-catalog.md` exist in `macros/observability/12-failure-reason-codes.md`. Mapping is 1:1.

## 4. Guards ↔ tests

- Forbidden/allowed matrix `guards/10` lines map 1:1 to CI gates in `testing/14-ci-gates.md`.
- Loop budgets `guards/12` match `engine/16-runtime-defaults.md` exactly.

## 5. Schemas ↔ pseudo-code

- `json/10-macro-definition.schema.json` matches the `MacroDefinition` shape consumed by `engine/10-pseudocode-runner.md`.
- `json/11-run-state.schema.json` matches state mutations in `engine/10`.
- `json/13-event-stream.schema.json` matches `BgToPanel` union in `engine/15`.

## Result

**Zero drift detected across 30 cross-references.** Spec is internally consistent.
