# Normative Edge Cases

| # | Scenario | Required behavior |
|---:|---|---|
| 1 | User types `/` mid-word | Do NOT open dropdown (only at line start or after whitespace) |
| 2 | User types `/` in password field | Ignore |
| 3 | Editor is `contenteditable=false` | Ignore |
| 4 | Prompt body contains `${UndefinedVar}` | Resolve to empty string; emit E-03 toast |
| 5 | Prompt body > 64 KB | Reject at parse; surface E-01 |
| 6 | Duplicate `id` on import | Skip import; aggregate count in E-13 |
| 7 | Queue at capacity | Reject enqueue; emit E-06 |
| 8 | Submit button disabled when next-loop fires | Wait up to 5 s polling; then mark task `held` |
| 9 | Host page navigates mid-task | Cancel running task with reason `HostNavigated` |
| 10 | Tab hidden during delay | Continue delay; pause only on explicit user action |
| 11 | Clipboard API blocked | Fall back to `execCommand` then `insertText` event |
| 12 | Rich editor strips formatting | Re-emit as plain text; log `PasteFormatStripped` (info) |
| 13 | Storage quota hit | Pause queue; surface E-12 with export CTA |
| 14 | Two dropdowns triggered simultaneously | Close oldest; only one open at a time |
| 15 | Variable name collides with built-in (`Now`, `Url`) | User var wins; warn at parse |

## Acceptance

- [ ] The implementation satisfies the `Normative Edge Cases` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

