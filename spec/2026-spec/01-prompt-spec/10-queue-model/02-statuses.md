# 02 — Task Statuses

**Date:** 2026-06-02
**Task:** T67

## States

```ts
type TaskStatus =
  | "pending"      // enqueued, not yet started
  | "processing"   // currently injecting or waiting for idle
  | "hold"         // paused by interruption; resumable
  | "completed"    // host returned idle after successful submit
  | "failed";      // terminal; carries FailureRecord
```

## Transition diagram

```text
pending ─► processing ─► completed
   │            │
   │            ├─► hold ─► processing   (user Resume)
   │            │     └──► failed         (Cancel)
   │            └─► failed
   └─► failed   (CancelAll while pending)
```

## Rules

- `completed` and `failed` are **terminal**; no further transitions.
- Only one task may be `processing` at a time per queue.
- `hold` is only entered from `processing` and only via the interruption observer (see `09-next-overview/04-interruption-detection.md`).
- Resume from `hold` re-enters `processing` **without** incrementing `attemptCount` (the original submit may already have landed; the engine waits for idle again rather than re-injecting).

## Acceptance

- [ ] The implementation satisfies the `02 — Task Statuses` contract in this file and the folder-level acceptance target: queued task shape, status transitions, capacity, storage, and ordering are enforced.
- [ ] Verification passes when `UT-queue-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
