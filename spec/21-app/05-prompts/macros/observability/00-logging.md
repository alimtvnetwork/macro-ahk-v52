# Observability — Logging

## Logger contract
All engine code logs via `RiseupAsiaMacroExt.Logger.error()` / `.warn()` / `.info()` (per Core memory rule). Bare `console.log` / `console.error` are CI-banned in `src/prompts/**`.

## Run-scoped log file
- Path: `spec/audit/<RunId>/_log.jsonl`
- Format: newline-delimited JSON, one event per line, UTF-8, LF.
- Append-only via `audit-writer.appendLog()`; never re-opened for rewrites.
- Persisted **before** the corresponding `MacroEvent` is broadcast to the panel (per `engine/09-event-stream.md`).

## Line shape
```json
{
  "EventSeq": 42,
  "TimestampKL": "2026-06-02T14:23:11.512+08:00",
  "Level": "info",
  "MacroSlug": "spec-tighten-cycle",
  "RunId": "…",
  "StepIndex": 3,
  "Type": "StepCompleted",
  "Payload": { /* event-specific */ },
  "Failure": null
}
```
On failure lines: `Level: "error"`, `Failure` = full mandatory failure-log shape (Reason, ReasonDetail, VariableContext[], SelectorAttempts[]).

## Per-process surfaces
| Context | Surface |
|---------|---------|
| Background SW | `_log.jsonl` + `Logger.error()` (which itself routes to session-logging SQLite) |
| Panel (React) | console group `console.groupCollapsed('[macro:<slug>]')` mirroring `_log.jsonl` tail |
| Injector (MAIN) | sends `StepResult` / `StepFailed` back to SW — never writes files directly |

## Verbose gating
- Per-project `Project.VerboseLogging` (Core rule) gates inclusion of:
  - Full resolved Body in `StepStarted` payload (otherwise just `ResolvedBodyChecksum`).
  - Full Output text in `StepCompleted` payload (otherwise `OutputChecksum` + `OutputBytes`).
- Sensitive Variables always masked regardless of verbose toggle.

## Rotation / retention
- `_log.jsonl` is per-RunId — no rotation needed (run-scoped).
- Session-logging SQLite mirror inherits the existing 7-day OPFS prune.
- Diagnostics export (`observability/03-export-bundle.md`) includes full `_log.jsonl`.

## CI guard
- `scripts/audit-error-swallow.mjs` flags any `catch` in `src/prompts/**` that doesn't call `Logger.error()` or re-throw — fails the build (no swallowed errors per Core rule).
