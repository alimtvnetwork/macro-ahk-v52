# 02 — Task Statuses

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
- `hold` is only entered from `processing` and only via the interruption observer (see `90-next-overview/04-interruption-detection.md`).
- Resume from `hold` re-enters `processing` **without** incrementing `attemptCount` (the original submit may already have landed; the engine waits for idle again rather than re-injecting).
