# 04 — Skip First

**Date:** 2026-06-02
**Task:** T79

## Default: **skip the delay before the first task** (`skipFirst: true`)

The user just clicked "Run" — making them wait 7s before anything visible happens feels broken.

```ts
let firstTaskDone = false;
async function maybeDelay(cfg: DelayConfig): Promise<void> {
  if (!firstTaskDone && (cfg.skipFirst ?? true)) {
    firstTaskDone = true;
    return;
  }
  await sleep(effectiveDelay(cfg));
}
```

## State scope

`firstTaskDone` is **per drain cycle**, not per process:
- Resets to `false` on `onQueueDrained`.
- Resets to `false` after a `cancelAll`.
- Does **not** reset on `pause` / `resumeLoop` — pausing mid-run shouldn't grant another "free" immediate task.

## When to set `skipFirst: false`

- Hosts where a sub-second cadence would race their own rate limiter and trigger a 429.
- Plan mode, where the first task is also the heaviest — a small lead-in delay lets the UI render the queue list before the first stream starts.
