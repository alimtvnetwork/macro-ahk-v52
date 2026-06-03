# 03 — User Feedback

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T83

## Surfaces

1. **Queue row badge** — coloured pill on the failed task: `Failed: <reason>`.
2. **Toast** — single toast per *blocking* failure (`LoggedOut`, `NavigationLost`). Per-task failures aggregate into one toast per drain cycle:
   > "3 tasks failed. Open queue for details."
3. **Inline action** — for `LoggedOut`: button "Open login". For `PromptMissing`: button "Edit prompts".

## Toast tone matrix

| Reason | Tone | Auto-dismiss |
|--------|------|--------------|
| `LoggedOut`, `NavigationLost` | error | sticky |
| `SubmitMissing`, `TargetDetached` | warning | 8s |
| `IdleTimeout`, `PasteRejected` | warning | 8s |
| `CancelledByUser` | info | 3s |
| `Unknown` | error | sticky |

## Accessibility

- Toasts use `role="status"` for info/warning, `role="alert"` for error.
- Queue row badges expose the full reason via `aria-label`; the visible text may be a 10-char abbreviation matching the project's badge convention.

## Click-through

Clicking a failed row opens a detail drawer showing the full `FailureRecord` (Reason, ReasonDetail, SelectorAttempts, VariableContext, timestamps). Verbose payloads are gated by the project's verbose-logging toggle.
