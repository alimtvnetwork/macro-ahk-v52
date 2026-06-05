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

## Acceptance

- [ ] The implementation satisfies the `01 — In-memory PromptStore reference` contract in this file and the folder-level acceptance target: reference snippets remain copyable and typecheck without hidden imports.
- [ ] Verification passes when `typecheck-spec-snippets.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

> Owner: see [Type safety standards](mem://architecture/type-safety-standards) for the authoritative rule backing the MUST/SHALL statements in this file.
