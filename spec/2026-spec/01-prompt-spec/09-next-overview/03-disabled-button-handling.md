# 03 — Disabled-Button Handling

**Date:** 2026-06-02
**Task:** T63

## Policy: retry-once-after-readiness-check

Per project Core memory (**No-Retry Policy**), there is **no exponential backoff** and **no recursive retry loop**. The engine attempts at most **two** readiness checks per task:

```
attempt 1: resolve() → if ready → click → done
           else: wait `readinessGraceMs` (default 750ms) and re-check ONCE
attempt 2: resolve() → if ready → click → done
           else: fail-fast with reason="SubmitDisabled"
```

## Configuration

```ts
interface ReadinessConfig {
  readinessGraceMs: number;     // default 750
  treatAriaDisabledAsBlocking: boolean; // default true
}
```

## Reasons surfaced

- `SubmitMissing` — resolver returned null on both attempts.
- `SubmitDisabled` — element present but `isReady` returned false on both attempts.

Each failure MUST emit the mandatory failure log shape (`Reason`, `ReasonDetail`, `SelectorAttempts[]`).

## Acceptance

- [ ] The implementation satisfies the `03 — Disabled-Button Handling` contract in this file and the folder-level acceptance target: NextLoop submission, disabled-button handling, interruption, and cancellation behavior is deterministic.
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
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

