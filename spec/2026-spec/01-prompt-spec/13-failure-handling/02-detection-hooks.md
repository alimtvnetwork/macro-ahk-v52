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
