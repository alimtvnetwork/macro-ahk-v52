# Pseudocode — Queue Engine

```ts
class QueueEngine {
  private q: QueueTask[] = [];
  enqueue(task: QueueTask) {
    assert(this.q.length < settings.queueCapacity, "QueueFull");
    this.q.push({ ...task, status: "pending", retries: 0 });
    emit("queue.enqueued", task);
  }
  async tick() {
    const next = this.q.find(t => t.status === "pending");
    if (!next) return;
    next.status = "running"; next.startedAt = nowIso();
    try {
      await runTask(next);
      next.status = "succeeded";
    } catch (err) {
      if (next.retries < settings.maxRetries) {
        next.retries++; next.status = "pending";
      } else {
        next.status = "failed";
        logFailure(buildFailureReport(next, err)); // mandatory schema
      }
    } finally {
      next.finishedAt = nowIso();
      emit("queue.task.finished", next);
    }
  }
}
```

Cross-refs: `10-queue-model/`, `11-queue-lifecycle/`, `13-failure-handling/05-mandatory-failure-log.md`.

## Acceptance

- [ ] The implementation satisfies the `Pseudocode — Queue Engine` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
