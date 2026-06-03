# 04 — Capacity

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
