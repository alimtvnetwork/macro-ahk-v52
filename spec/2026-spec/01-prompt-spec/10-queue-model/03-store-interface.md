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
