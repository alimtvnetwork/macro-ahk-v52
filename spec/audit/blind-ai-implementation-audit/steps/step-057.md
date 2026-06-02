# Step 57 — Self-healing script storage (builtin-script-guard)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://architecture/self-healing-script-storage` (two-stage recovery)

## Reasoning
If a builtin script gets dropped from storage, two-stage recovery is supposed to repair it silently. Critical for blind LLM safety net.

## Findings
- ✅ `src/background/builtin-script-guard.ts` exists.
- 🔴 **Gap**: `rg "builtin-script-guard"` in `src/background/__tests__` returns 0 hits — **no dedicated test** for the two-stage recovery contract. Violates `mem://preferences/test-with-features`.
- 🟡 **Med**: spec for the two-stage flow lives only in memory + storage-layers doc, not in `04-architecture/`.

## Recommendation
Add `builtin-script-guard.test.ts` covering: (a) missing builtin → stage-1 reseed; (b) stage-1 failure → stage-2 fallback; (c) success path no-op.
