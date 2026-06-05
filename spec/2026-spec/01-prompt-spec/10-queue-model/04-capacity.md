# 04 — Capacity

**Date:** 2026-06-02
**Task:** T69

## Default cap: **999 tasks**

```ts
interface CapacityConfig {
  maxQueueSize: number;          // default 999
  maxBulkEnqueue: number;        // default 999, single Next/Plan invocation
}
```

## Enforcement

- `add` / `addMany` reject with `QueueError { reason: "CapacityExceeded", limit, current }` when the resulting size of `pending + processing + hold` would exceed `maxQueueSize`.
- Terminal tasks (`completed`, `failed`) do **not** count toward capacity — they are evicted by `clearTerminal()` or by an LRU sweep at 2× cap.

## Rationale

999 covers every realistic Next/Plan-mode batch (typical use: 5–50). The cap exists to prevent UI freeze when a user accidentally requests an absurd count, not to throttle legitimate use.

## UI guidance

When the user enters a count `> maxQueueSize - currentPending`, the input MUST surface inline: *"Only X slots available (cap 999)"*. No silent truncation.

## Acceptance

- [ ] The implementation satisfies the `04 — Capacity` contract in this file and the folder-level acceptance target: queued task shape, status transitions, capacity, storage, and ordering are enforced.
- [ ] Verification passes when `UT-queue-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

<!-- audit: inline-types -->

## Type & Schema (canonical)

```json
{
  "$id": "QueueCapacity",
  "type": "object",
  "required": ["maxItems","maxAgeMs"],
  "properties": {
    "maxItems": { "const": 3 },
    "maxAgeMs": { "const": 5000 },
    "overflowPolicy": { "enum": ["reject-new","drop-oldest"], "default":"reject-new" }
  }
}
```
