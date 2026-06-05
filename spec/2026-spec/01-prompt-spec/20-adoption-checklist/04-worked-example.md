# 04 — Worked example: shipping Prompts to "HelpDeskly"

**Date:** 2026-06-02
**Task:** T119

**Scenario.** A fictional support-chat web app **HelpDeskly** wants the Prompts feature so agents can fire canned replies and run a 5-step "summarize ticket" loop.

**Q-answers**
| Q | Value |
|---|-------|
| Q1 | `document.querySelector('[data-testid="composer"]')` (contenteditable) |
| Q2 | `document.querySelector('button[aria-label="Send reply"]')` |
| Q3 | `document.querySelector('[data-testid="agent-take-over-banner"]')` |
| Q4 | `contenteditable` |
| Q5 | `fetch('/api/me').then(r => r.ok)` |
| Q6 | 6 s ± 20 % jitter |
| Q7 | 50 (agents rarely fire more) |
| Q8 | `localStorage` |

**Wire-up**
1. Drop the in-memory store (T111) seeded from `prompts/*/info.json` ship payload.
2. Mount the dropdown above the composer; trigger on `/` slash command.
3. Register `contentEditableAdapter` (T114) only — no other adapters needed.
4. Instantiate `createNextLoop(host, store)` (T115) with the four host hooks.
5. Add a Plan-mode button bound to the plan profile, `count` = 5.

**Live behaviour**
- Agent types `/summary` → dropdown filters → Enter pastes prompt → composer fires Send.
- Plan-mode click enqueues 5 tasks at 12 s spacing; banner observed → loop pauses; agent resumes manually.
- `/api/me` returns 401 → loop logs `Reason=LoggedOut`, halts, surfaces toast.

No `MacroController`, no `chrome.*`, no `RiseupAsia*` — confirming the spec ports cleanly.

## Acceptance

- [ ] The implementation satisfies the `04 — Worked example: shipping Prompts to "HelpDeskly"` contract in this file and the folder-level acceptance target: pre-flight, wire-up, go-live, worked example, and handoff steps stay complete.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

