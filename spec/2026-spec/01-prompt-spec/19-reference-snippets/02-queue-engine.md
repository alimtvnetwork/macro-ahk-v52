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
