# 04 — In-App Help

**Date:** 2026-06-02
**Task:** T104

## Surfaces

1. **`?` button** in the dropdown footer → opens a slide-over with:
   - Keyboard shortcut reference.
   - Variable cheat sheet (`{{date}}`, `{{selection}}`, `{{cursor}}`, host-registered vars).
   - Link to "Replay tour".
2. **Tooltip-on-hover** for every queue-row failure badge — shows the `FailureReason` + one-sentence "what to do".
3. **Inline hint chips** under fields where validation has nuance (e.g. the delay slider's "below 5s risks throttling").

## Replay tour

`prompts.onboarding.completedV1 = false` + reload. The "Replay tour" link sets the flag and reloads only the feature surface (not the host page).

## Content authoring

Help strings live in a single `help.json` file colocated with the feature, keyed by stable ids. The host MAY override by registering a `HelpStringsProvider` at bootstrap (mirrors the host-overrides pattern in `15-settings/04-host-overrides.md`).

## i18n

Out of scope for v1. All strings are English. The provider hook leaves room for translation without code changes.

## Acceptance

- [ ] The implementation satisfies the `04 — In-App Help` contract in this file and the folder-level acceptance target: first-run, guided tour, empty states, help, and adoption telemetry remain discoverable.
- [ ] Verification passes when `E2E-onb-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

