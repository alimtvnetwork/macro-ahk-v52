# 02 — Process Tick

**Date:** 2026-06-02
**Task:** T72

## Single-runner loop

Exactly **one** in-flight task per queue. The loop is a self-rescheduling async function — never `setInterval`.

```ts
async function tick(): Promise<void> {
  if (running) return;
  running = true;
  try {
    while (true) {
      const next = await store.list({ status: ["pending"] }).then(xs => xs[0]);
      if (!next) break;
      await runOne(next);
      await delay.wait();           // see Step 12
    }
  } finally {
    running = false;
  }
}
```

## `runOne` outline

1. `store.update(id, { status: "processing", startedAt: nowIso() })`.
2. Resolve ChatBox target → `adapter.insertText(target, task.renderedBody)`.
3. On insert failure → mark `failed` with mandatory failure record.
4. Click submit (`09-next-overview/02-host-submit-button.md`).
5. `observer.whenIdle({ timeoutMs })`:
   - `Idle` → `completed`.
   - `Interrupted` → `hold` (timer stops; user resumes manually).
   - `Timeout` → `failed { reason: "IdleTimeout" }`.
6. Emit `QueueEvent { kind: "taskCompleted" | "taskFailed" | "taskHeld" }`.

## Concurrency guard

A second `tick()` call while `running === true` is a no-op. New `add`/`addMany` callers fire `tick()` defensively; the guard makes that safe.

## Visibility

When `document.hidden`, the loop continues but the **delay engine** may extend its sleep (Step 12, `05-pause-during-delay.md`). Per Core memory, idle UIs pause; the queue itself does not.

## Acceptance

- [ ] The implementation satisfies the `02 — Process Tick` contract in this file and the folder-level acceptance target: enqueue, tick, retry, hold, cancel, pause, and completion events follow the queue lifecycle.
- [ ] Verification passes when `UT-lifecycle-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
