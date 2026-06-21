---
Slug: queue-runner
Status: pending
Created: 2026-06-21
Parent: 01-task-next-queue-sequential
---

# SS-02 — Queue runner implementation

## State additions (`task-next-ui.ts` near line 32)

```ts
export const taskNextState = {
  // ...existing fields
  queue: {
    total: 0,        // N requested
    completed: 0,    // cycles that finished
    running: false,  // true while a queue is active
    startedAt: 0,    // Date.now() of cycle 0
  },
};
```

## Runner shape

```ts
export async function runTaskNextQueue(deps: TaskNextDeps, count: number) {
  if (taskNextState.running) { log('Task Next: queue already running', 'warn'); return; }
  const n = Math.max(1, Math.floor(count) || 1);
  if (n === 1) { runTaskNextLoop(deps, 1); return; }  // single-paste legacy path

  taskNextState.running = true;
  taskNextState.cancelled = false;
  taskNextState.queue = { total: n, completed: 0, running: true, startedAt: Date.now() };

  try {
    for (let k = 0; k < n; k++) {
      if (taskNextState.cancelled) { showPasteToast(`🛑 Task Next queue cancelled at ${k}/${n}`, false); break; }
      const cycleStart = Date.now();
      const prompt = findNextTasksPrompt(deps);
      if (!prompt?.text) throw new Error('PromptNotFound');

      const outcome = pasteIntoEditor(prompt.text, deps.getPromptsConfig(), deps.getByXPath);
      if (String(outcome) === 'failed') throw new Error('PasteFailed');

      await clickSubmitButton(deps);                  // reuse Repeat Loop helper
      await waitForLovableIdle(deps, { debounceMs: 250, timeoutMs: 180_000 });

      taskNextState.queue.completed = k + 1;
      updateQueueBadge();                              // see SS — queue indicator
      log(`[TaskNextQueue] cycle ${k + 1}/${n} idle=${Date.now() - cycleStart}ms`, 'info');
    }
    if (!taskNextState.cancelled) showPasteToast(`✅ Task Next queue finished ${n}/${n}`, false);
  } catch (err) {
    Logger.error('TaskNextQueue.cycle', {
      Reason: err instanceof Error ? err.message : 'Unknown',
      ReasonDetail: String(err),
      CycleIndex: taskNextState.queue.completed,
      Total: n,
      ElapsedMs: Date.now() - taskNextState.queue.startedAt,
    });
    showPasteToast(`❌ Task Next queue failed at ${taskNextState.queue.completed + 1}/${n}`, true);
  } finally {
    taskNextState.queue.running = false;
    taskNextState.running = false;
    hideQueueBadge();
  }
}
```

## Constraints

- Sequential fail-fast (`mem://constraints/no-retry-policy`) — no exponential backoff, no per-cycle retry beyond the single auth retry that `pasteIntoEditor` already does internally.
- Every catch logs via `Logger.error('TaskNextQueue.cycle', …)` with the mandatory schema (`mem://standards/verbose-logging-and-failure-diagnostics`).
- `runTaskNextLoop(deps, 1)` is left untouched so the split-button label still does its paste-once behaviour from v3.79.x.

## Done when

- Function added and exported from `task-next-ui.ts`.
- Submit-click + idle-wait helpers either reused from `repeat-loop-ui.ts` or extracted to `lovable-idle.ts` (see SS-01).
- Vitest covers the four cases listed in step 5 of the parent plan.
