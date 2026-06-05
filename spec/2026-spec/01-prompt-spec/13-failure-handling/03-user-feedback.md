# 03 — User Feedback

**Date:** 2026-06-02
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

## Pitfalls

- **Silent-failure counter-example:** do not show only a toast and then discard the failure; the failed queue row MUST retain the complete `FailureRecord` for inspection.
- **Code Red log-shape counter-example:** do not truncate structural diagnostics when verbose logging is off; only captured HTML/Text snippets are gated, while `SelectorAttempts[]` and `VariableContext[]` remain complete.

## Acceptance

- [ ] The implementation satisfies the `03 — User Feedback` contract in this file and the folder-level acceptance target: every failure path emits the mandatory failure-log shape and user-visible feedback.
- [ ] Verification passes when `UT-fail-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
