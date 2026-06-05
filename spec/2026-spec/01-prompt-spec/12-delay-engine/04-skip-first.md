# 04 — Skip First

**Date:** 2026-06-02
**Task:** T79

## Default source of truth

Implementations MUST use `SKIP_FIRST_DELAY` from [Runtime Defaults](../reference/05-runtime-defaults.md). When it is true, the engine skips the delay before the first task in a drain cycle.

The user just clicked "Run" — making them wait for `DELAY_MS` before anything visible happens feels broken.

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

## Acceptance

- [ ] The implementation satisfies the `04 — Skip First` contract in this file and the folder-level acceptance target: default delay, settings, jitter, skip-first, and pause semantics use runtime defaults.
- [ ] Verification passes when `UT-delay-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.
