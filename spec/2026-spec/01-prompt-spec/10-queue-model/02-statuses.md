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

<!-- audit: inline-types -->

## Type & Schema (canonical)

```json
{
  "$id": "QueueStatus",
  "type": "string",
  "enum": ["queued","running","done","failed","cancelled"],
  "description": "Closed enum; transitions: queued -> running -> (done|failed|cancelled). Backwards transitions are forbidden."
}
```

---

> Owner: see [Data storage layers](mem://architecture/data-storage-layers) for the authoritative rule backing the MUST/SHALL statements in this file.
