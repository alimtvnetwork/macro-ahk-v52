# 02 — Detection Hooks

**Date:** 2026-06-02
**Task:** T82

## Host-supplied hooks

```ts
interface FailureDetectors {
  /** Resolves quickly; cookie / token presence check. No network. */
  isAuthenticated(): boolean;
  /** Mutation-observer for the host's "return to chat" / quota banners. */
  watchInterruption(cb: (detail: string) => void): () => void;
  /** Optional: subscribe to host fetch/XHR for 401/403 fast-path. */
  watchUnauthorized?(cb: () => void): () => void;
}
```

Hosts MUST provide `isAuthenticated` and `watchInterruption`. `watchUnauthorized` is optional; without it the engine still catches auth issues via `isAuthenticated` checks pre-tick.

## When detectors fire

| Hook | When called by engine |
|------|----------------------|
| `isAuthenticated()` | Before every `runOne`; before resume from `hold`. |
| `watchInterruption` | Subscribed once at engine start, disposed on dispose. |
| `watchUnauthorized` | Subscribed once at engine start; on fire, marks current task `hold` and pauses queue. |

## Default DOM probes

If the host omits a hook, the engine falls back to:
- `isAuthenticated`: `document.cookie` non-empty for a host-named cookie (configurable).
- `watchInterruption`: MutationObserver on `document.body` for elements matching a host-supplied selector.

## Teardown

All subscriptions return a disposer. Engine disposal calls every disposer, registers `pagehide` cleanup per the project Timer & Observer Teardown rule.

## Pitfalls

- **Silent-failure counter-example:** do not let a detector throw and continue the queue; detector errors MUST become a typed failure with the hook name in `ReasonDetail`.
- **Code Red log-shape counter-example:** do not record `watchInterruption failed` without selector details; selector-based detectors MUST populate `SelectorAttempts[]`, and non-selector detectors MUST add a synthetic `null` selector reason.

## Acceptance

- [ ] The implementation satisfies the `02 — Detection Hooks` contract in this file and the folder-level acceptance target: every failure path emits the mandatory failure-log shape and user-visible feedback.
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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../README.md) for sibling specs and cross-references.

## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
