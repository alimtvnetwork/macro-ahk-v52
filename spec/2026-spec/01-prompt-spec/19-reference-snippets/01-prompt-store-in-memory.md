# 01 — In-memory PromptStore reference

**Date:** 2026-06-02
**Task:** T111
**~40 LOC TypeScript pseudo-code, no repo imports.**

```ts
import type { Prompt, PromptStore } from "../02-data-model";

export function createInMemoryPromptStore(seed: Prompt[] = []): PromptStore {
  const byId = new Map<string, Prompt>(seed.map((p) => [p.id, p]));

  return {
    async list() {
      return [...byId.values()].sort((a, b) => a.order - b.order);
    },
    async get(id) {
      return byId.get(id) ?? null;
    },
    async save(p) {
      const now = new Date().toISOString();
      const next: Prompt = {
        ...p,
        updatedAt: now,
        createdAt: byId.get(p.id)?.createdAt ?? now,
      };
      byId.set(next.id, next);
      return next;
    },
    async delete(id) {
      byId.delete(id);
    },
    async import(batch) {
      for (const p of batch) byId.set(p.id, p);
    },
    async export() {
      return [...byId.values()];
    },
  };
}
```

**Notes**
- Pure JS Map; no persistence. Host wraps with `localStorage` / IndexedDB / SQLite adapter.
- Sort by `order` is stable for FIFO display.
- `save` preserves `createdAt`, refreshes `updatedAt`.
