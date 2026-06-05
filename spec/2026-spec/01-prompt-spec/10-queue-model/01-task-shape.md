# 01 — Queue Task Shape

**Date:** 2026-06-02
**Task:** T66

```ts
interface QueuedTask {
  id: string;                    // ULID; stable across persistence
  kind: "next" | "plan" | "custom";
  promptSlug: string;            // resolved at enqueue time
  renderedBody: string;          // snapshotted text injected into ChatBox
  status: TaskStatus;            // see 02-statuses.md
  attemptCount: number;          // 0 or 1 only (no-retry policy)
  holdUntil?: string;            // ISO; set when status = "hold"
  createdAt: string;             // ISO
  startedAt?: string;
  completedAt?: string;
  failure?: FailureRecord;       // see 100-failure-handling/05-mandatory-failure-log
  contextSnapshot: PromptContext; // captured at enqueue; loader uses for render replay
}
```

## Invariants

- `id` is generated at enqueue, never mutated.
- `renderedBody` is computed **once** at enqueue using the loader; later edits to the prompt do not retroactively change queued tasks. This guarantees reproducibility.
- `attemptCount` is `{0,1}`. Beyond 1 violates the No-Retry policy.

## Serialization

When persisted (optional), tasks are JSON; `PromptContext` MUST be JSON-safe (no functions, no DOM refs).

## Acceptance

- [ ] The implementation satisfies the `01 — Queue Task Shape` contract in this file and the folder-level acceptance target: queued task shape, status transitions, capacity, storage, and ordering are enforced.
- [ ] Verification passes when `UT-queue-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.

<!-- audit: inline-types -->

## Type & Schema (canonical)

```json
{
  "$id": "QueueTask",
  "type": "object",
  "required": ["id","promptId","status","createdAt"],
  "properties": {
    "id":         { "type":"string", "pattern":"^[0-9A-HJKMNP-TV-Z]{26}$" },
    "promptId":   { "type":"string", "pattern":"^[0-9A-HJKMNP-TV-Z]{26}$" },
    "status":     { "enum":["queued","running","done","failed","cancelled"] },
    "createdAt":  { "type":"string", "format":"date-time" },
    "startedAt":  { "type":"string", "format":"date-time" },
    "finishedAt": { "type":"string", "format":"date-time" },
    "attempt":    { "type":"integer", "minimum":1, "maximum":1 },
    "reason":     { "type":"string", "maxLength":80 }
  },
  "additionalProperties": false
}
```
