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

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** assign every failure a stable `Reason` code from `reference/02-failure-reason-codes.md` plus a `ReasonDetail` string; missing codes are rejected by `check-must-constants.mjs`.
- **MUST** log via `Logger.error(scope, reason, caughtError)` — never bare `console.error`, never empty `catch {}`.
- **MUST** populate `SelectorAttempts[]` (id/strategy/expression/matched/matchCount/reason) on every selector miss; unknown fields written as `null` with a reason.
- **MUST** populate `VariableContext[]` (name/source/row/column/resolvedValue/type/reason) on every variable/data failure.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* TODO */ }`. ✅ Rejected by `public/error-swallow-audit.json`.
- ❌ Logging only the message string. ✅ Pass the `caught` object so stack + cause survive.
- ❌ Omitting `SelectorAttempts` because "only one selector was tried". ✅ Still log the single attempt with `matchCount=0`.
- ❌ Masking the user value in `VariableContext` by default. ✅ Always log the field name + type; mask the value only when verbose-logging is OFF.
- ❌ Retrying after `Reason="HostBlocked"`. ✅ Surface to user; require manual unblock.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
