# 02 — Guided Tour Steps

**Date:** 2026-06-02
**Task:** T102

## Step sequence

| # | Anchor | Copy (sample) | Advance trigger |
|---|--------|---------------|-----------------|
| 1 | Dropdown trigger button | "Open the prompts menu to see what's available." | User clicks the trigger |
| 2 | Search input | "Type to filter — searches title, slug, and body." | User types ≥1 char OR clicks Next |
| 3 | First prompt row | "Pick any prompt; pressing Enter sends it to the chat." | User selects a prompt |
| 4 | Submit button (host) | "We just pasted it. Click submit when you're ready." | User clicks submit OR 5s elapse |
| 5 | Queue widget | "Re-runs and Plan mode show progress here." | User clicks "Got it" |

## Anchor resolution

Each step resolves its anchor via the same selector contract as the rest of the feature (`???` placeholders with `HOST:` hints). If an anchor cannot be resolved, the step is **skipped silently** — onboarding never blocks on a missing host element.

## Visual style

- Spotlight overlay (dimmed background, anchor cut-out).
- Tooltip with one-line copy + "Next" / "Skip tour" buttons.
- Dark theme only (per Core memory).

## Persistence per step

Each completed step writes `prompts.onboarding.step<N> = true`. On reload, the tour resumes from the lowest incomplete step. Completing step 5 sets `completedV1 = true`.

## Acceptance

- [ ] The implementation satisfies the `02 — Guided Tour Steps` contract in this file and the folder-level acceptance target: first-run, guided tour, empty states, help, and adoption telemetry remain discoverable.
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

