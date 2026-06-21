# Marco Chrome Extension v3.90.0

## Added

- `refill-priority-credit-resolved.test.ts` — locks the resolver → refill-priority repaint chain. Before cache write, a Ktlo workspace (inline available=0) sits behind Pro (available=50). After `__writeCreditBalanceUpdateMemoryCacheForTests(ws-ktlo, 500)`, `sortByRefillPriority` flips the order on the next call (urgency window K=10, daysToRefill=1 → score 9×500 vs 9×50).

## Verification

- Before: only component-level test proved the dropdown repaints; nothing pinned that the refill-priority *sort key* recomputes from fresh resolver data.
- After: `bunx vitest run …/refill-priority-credit-resolved.test.ts` → **1/1 passed**.
- `node scripts/check-version-sync.mjs` → `✅ All versions in sync: 3.90.0`.
