# 03 — Queue Store Interface

**Date:** 2026-06-02
**Task:** T68

```ts
interface QueueStore {
  add(task: QueuedTask): Promise<void>;
  addMany(tasks: QueuedTask[]): Promise<void>;

  get(id: string): Promise<QueuedTask | null>;
  list(filter?: { status?: TaskStatus[] }): Promise<QueuedTask[]>;

  update(id: string, patch: Partial<QueuedTask>): Promise<void>;
  remove(id: string): Promise<void>;
  clearTerminal(): Promise<number>; // removes completed + failed; returns count

  /** Emits on every mutation; consumers diff their view. */
  subscribe(listener: (event: QueueStoreEvent) => void): () => void;
}

type QueueStoreEvent =
  | { kind: "added"; ids: string[] }
  | { kind: "updated"; id: string; fields: (keyof QueuedTask)[] }
  | { kind: "removed"; ids: string[] };
```

## Implementations

- **Default:** `InMemoryQueueStore` (Map keyed by id). Lost on reload — acceptable for v1.
- **Optional:** `IndexedDbQueueStore` for hosts that need survival across navigations. Same interface, async semantics already match.

## Forbidden

- `localStorage` — synchronous and 5MB-bounded; out of contract.
- Cross-tab sync — explicit non-goal (see `01-glossary/03-non-goals.md`).

## Acceptance

- [ ] The implementation satisfies the `03 — Queue Store Interface` contract in this file and the folder-level acceptance target: queued task shape, status transitions, capacity, storage, and ordering are enforced.
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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

<!-- audit: inline-types -->

## Type & Schema (canonical)

```json
{
  "$id": "QueueStore.method-signatures",
  "type": "object",
  "properties": {
    "timeoutMs":   { "const": 5000 },
    "methodNames": { "type":"array", "items":{"type":"string"},
                     "default": ["enqueue","peek","markRunning","markDone","markFailed","cancel","list"] }
  }
}
```
