# 02 — Queue engine reference

**Date:** 2026-06-02
**Task:** T112
**~80 LOC TypeScript pseudo-code.**

```ts
import type { QueuedTask, QueueStore } from "../10-queue-model";

export interface QueueEngineOptions {
  store: QueueStore;
  runTask: (t: QueuedTask) => Promise<void>;
  delayMs: () => number;          // jittered delay
  skipFirstDelay?: boolean;
  isAuthenticated: () => Promise<boolean>;
  watchInterruption: () => Promise<void>;
}

export function createQueueEngine(opts: QueueEngineOptions) {
  let paused = false;
  let stopRequested = false;
  let running = false;
  let firstTick = true;

  async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try {
      while (!stopRequested) {
        if (paused) { await wait(150); continue; }
        const task = await opts.store.nextPending();
        if (!task) return;

        if (!(await opts.isAuthenticated())) {
          await opts.store.markFailed(task.id, "LoggedOut", "auth probe failed");
          return; // fail-fast, no retry
        }

        if (!firstTick || !opts.skipFirstDelay) {
          await sleepInterruptible(opts.delayMs(), () => paused || stopRequested);
        }
        firstTick = false;

        await opts.store.markProcessing(task.id);
        try {
          await Promise.race([opts.runTask(task), opts.watchInterruption()]);
          await opts.store.markCompleted(task.id);
        } catch (err) {
          await opts.store.markFailed(task.id, "RunThrew", String(err));
          return; // fail-fast
        }
      }
    } finally {
      running = false;
    }
  }

  return {
    enqueue: (t: QueuedTask) => opts.store.enqueue(t),
    enqueueBulk: (ts: QueuedTask[]) => opts.store.enqueueBulk(ts),
    start: () => { stopRequested = false; void tick(); },
    pause:  () => { paused = true; },
    resume: () => { paused = false; void tick(); },
    cancel: async () => { stopRequested = true; await opts.store.clearPending(); },
    requeue: (id: string) => opts.store.requeue(id),
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sleepInterruptible(ms: number, abort: () => boolean) {
  const step = 100;
  for (let elapsed = 0; elapsed < ms; elapsed += step) {
    if (abort()) return;
    await wait(step);
  }
}
```

**Notes**
- Single-flight `running` guard; safe to call `start()` repeatedly.
- No exponential backoff; one auth probe, then fail. Matches project No-Retry policy.
- `sleepInterruptible` polls every 100 ms so `pause`/`cancel` interrupt the delay.

## Acceptance

- [ ] The implementation satisfies the `02 — Queue engine reference` contract in this file and the folder-level acceptance target: reference snippets remain copyable and typecheck without hidden imports.
- [ ] Verification passes when `typecheck-spec-snippets.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

