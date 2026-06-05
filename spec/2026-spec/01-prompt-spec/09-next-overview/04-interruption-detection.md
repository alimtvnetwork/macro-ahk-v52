# 04 — Interruption Detection

**Date:** 2026-06-02
**Task:** T64

## Purpose

After clicking submit, the engine must detect **(a)** when the host finishes processing and **(b)** when the host shows an interruption surface (e.g. "Return to chat", quota banner, login wall) that should pause the queue.

## Host contract

```ts
interface BusyIdleObserver {
  /** Resolves when the host is idle and ready for the next prompt. */
  whenIdle(opts: { timeoutMs: number }): Promise<IdleResult>;
}

type IdleResult =
  | { kind: "Idle" }
  | { kind: "Interrupted"; detail: string }
  | { kind: "Timeout" };
```

## Default detection template

```ts
const interruptionBanner = ???; // HOST: interruption / "return to chat" banner
// Example: document.querySelector('[role="alert"][data-kind="resume"]');
```

## Detection signals (combine, first-match wins)

1. **DOM mutation** — submit button re-enables → `Idle`.
2. **Interruption banner present** → `Interrupted`.
3. **Network listener** (optional) — 401/403 → `Interrupted { detail: "Unauthorized" }`.
4. **Timeout** — `timeoutMs` elapsed (default 120000) → `Timeout`.

## Pause semantics

`Interrupted` puts the queue into `hold` status (not `failed`) so the user can resolve and resume manually. `Timeout` and signal failures escalate to `failed` per `100-failure-handling/`.

## Acceptance

- [ ] The implementation satisfies the `04 — Interruption Detection` contract in this file and the folder-level acceptance target: NextLoop submission, disabled-button handling, interruption, and cancellation behavior is deterministic.
- [ ] Verification passes when `E2E-next-001..005` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

