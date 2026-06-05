# 03 — Go-live checklist

**Date:** 2026-06-02
**Task:** T118

**Functional**
- [ ] Dropdown opens from host trigger and lists default + user prompts.
- [ ] Search filters by title + slug + body.
- [ ] Selecting a prompt pastes into the chat-box and passes read-back verification.
- [ ] Submit-button click is detected and the host actually sends the message.
- [ ] Next loop with N=3 sends three messages with the configured delay.
- [ ] Pause interrupts the active delay timer (no overshoot).
- [ ] Cancel clears all pending tasks and stops the engine.
- [ ] Plan mode entry point uses the plan profile (12 s delay, `skipFirst:false`).

**Failure**
- [ ] Logged-out probe returns false → engine fails fast with `Reason=LoggedOut`.
- [ ] Submit-button missing → `Reason=SubmitMissing` with full `SelectorAttempts[]`.
- [ ] Interruption banner → loop pauses and surfaces the banner status.
- [ ] Failure log includes `Reason`, `ReasonDetail`, `SelectorAttempts[]`, `VariableContext[]`.

**Non-functional**
- [ ] No `chrome.*`, `MacroController`, or `RiseupAsia*` references leaked.
- [ ] No retry-with-backoff anywhere in the engine (No-Retry policy).
- [ ] No `Supabase` dependency.
- [ ] Verbose logging defaults to OFF; full prompt bodies only persisted when ON.
- [ ] `readme.txt` (if shipped) contains no clock/timestamp/git-update values.

Sign-off requires every box ticked.

## Acceptance

- [ ] The implementation satisfies the `03 — Go-live checklist` contract in this file and the folder-level acceptance target: pre-flight, wire-up, go-live, worked example, and handoff steps stay complete.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

