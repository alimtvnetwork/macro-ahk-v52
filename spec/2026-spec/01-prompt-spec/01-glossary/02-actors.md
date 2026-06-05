# T22 · Actors

**Created:** 2026-06-02

Three actors interact with this spec. Every later section MUST be
readable from at least one of these vantage points.

## 1. End User
- Picks prompts from a dropdown, edits them, kicks off Next/Plan loops.
- Cares about: prompt findability, paste reliability, delay tuning, cancel.
- Does **not** know or care about XPaths, queues, or adapters.

## 2. Integrator (engineer wiring the feature into a HostApp)
- Implements `PromptStore`, `QueueStore`, `SettingsStore` against their stack.
- Answers Q1–Q8 in `140-integration-onboarding/01-questionnaire.md`.
- Picks an `EditorKind` and the matching paste adapter.
- Cares about: deterministic contracts, framework-agnostic snippets, smoke tests.

## 3. AI Model consuming this spec
- Reads the folder top-to-bottom to regenerate the feature in a new codebase.
- Needs explicit interfaces, no hidden coupling to this repo, and an
  unambiguous `???` convention for every host-supplied value.
- MUST be able to ask the human Integrator the Q1–Q8 questions before
  emitting code.

## Out of scope (not actors)
- HostApp backend / chatbot LLM provider.
- Telemetry collector.
- CI / release pipeline of the HostApp.

## Acceptance

- [ ] The implementation satisfies the `T22 · Actors` contract in this file and the folder-level acceptance target: all downstream terms, actors, states, and banned vocabulary stay defined and consistently named.
- [ ] Verification passes when `LINT-glossary-coverage` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
