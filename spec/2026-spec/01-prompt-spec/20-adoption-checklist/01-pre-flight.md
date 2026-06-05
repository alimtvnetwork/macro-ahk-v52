# 01 — Pre-flight checklist

**Date:** 2026-06-02
**Task:** T116

Before any code lands, confirm every `???` from the integration questionnaire (T101) has a real value.

| # | Question | Owner | Status |
|---|---------|-------|--------|
| Q1 | Chat-box selector / XPath | Host integrator | ☐ |
| Q2 | Submit-button selector | Host integrator | ☐ |
| Q3 | Interruption banner selector | Host integrator | ☐ |
| Q4 | Editor kind (textarea / contenteditable / ProseMirror / Lexical / Monaco) | Host integrator | ☐ |
| Q5 | Authenticated probe (cookie / endpoint / DOM) | Host integrator | ☐ |
| Q6 | Default delay window (default 5–10 s) | Product | ☐ |
| Q7 | Max queue size (default 999) | Product | ☐ |
| Q8 | Settings storage backend (default `localStorage`) | Host integrator | ☐ |

**Gate:** Do not start wire-up until every row is ticked. Selector drift detected later is treated as a host bug, not a spec bug.

## Acceptance

- [ ] The implementation satisfies the `01 — Pre-flight checklist` contract in this file and the folder-level acceptance target: pre-flight, wire-up, go-live, worked example, and handoff steps stay complete.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

