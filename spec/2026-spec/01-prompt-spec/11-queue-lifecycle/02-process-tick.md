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

---

> Owner: see [No-retry policy](mem://constraints/no-retry-policy) for the authoritative rule backing the MUST/SHALL statements in this file.
