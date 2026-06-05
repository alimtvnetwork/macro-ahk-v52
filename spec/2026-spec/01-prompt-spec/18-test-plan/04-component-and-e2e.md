# 04 — Component & E2E

**Date:** 2026-06-02
**Task:** T109

## Component (Testing Library)

| Component | Critical assertions |
|-----------|---------------------|
| Dropdown | Open via trigger, filter by search, Enter selects, Esc closes, focus returns to trigger |
| Prompt editor modal | Dirty tracking, Ctrl+S saves, Esc with dirty prompts confirm, slug immutable after create |
| Queue widget | Status pill renders for each `TaskStatus`, drag reorder updates `sortKey`, terminal tasks collapsible |
| Settings page | Per-section dirty + save, reset confirm, inline validation, autoclamps slider values |
| Plan panel | Steps clamp 1–50, missing slug disables Run, Enter on panel triggers Run |

## E2E happy paths (manual Chrome, per Core memory ban-lift)

1. **Open + run once** — open dropdown, pick default prompt, observe ChatBox receives text and submit clicks.
2. **Run × 5** — same, with count 5; queue widget shows 5 rows draining to `completed`.
3. **Pause + resume** — start a queue of 10, pause after task 2, resume, all 10 complete.
4. **Hold + recover** — trigger interruption banner mid-queue, queue holds, dismiss banner, click Resume, queue drains.
5. **Plan mode** — open plan panel, set steps=10, Run, observe plan prompt rendered with `{{count}}=10` and output stream completes.

## E2E acceptance criteria

- Each path completes in < 90s on a developer machine.
- No console errors at any point.
- Failure drawer shows zero entries after each successful run.
- Diagnostics export ZIP includes the expected events for the run.

## Acceptance

- [ ] The implementation satisfies the `04 — Component & E2E` contract in this file and the folder-level acceptance target: test inventories, target lists, fixtures, and mocks remain discoverable by automation.
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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

