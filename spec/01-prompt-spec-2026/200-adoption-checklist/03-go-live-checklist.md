# 03 — Go-live checklist

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
