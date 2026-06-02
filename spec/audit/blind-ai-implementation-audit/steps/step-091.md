# Step 91 — Cross-cutting: error swallowing audit

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://features/error-swallow-audit-generator`

## Findings
- ✅ `scripts/audit-error-swallow.mjs` + `check-no-swallowed-errors.mjs` with baseline JSON.
- ✅ Wired to Options audit panel via `public/error-swallow-audit.json`.
- 🟡 **Med**: baseline allows existing swallows — blind LLM may add new ones if baseline isn't tightened.

## Recommendation
Add CI step: baseline file diff must shrink monotonically over time.
