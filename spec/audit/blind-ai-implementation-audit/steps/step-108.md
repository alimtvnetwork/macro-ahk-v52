# Step 108 — Revised top-7 priority order (post-verification)

**Timestamp:** 2026-06-02

## Revisions after Batch 11 verification
- ❌ **Drop S96** from top-7 — PERF-1 is **already fixed** in `hot-reload.ts` (Step 104). Just needs memory update.
- ✅ **Promote**: nothing new — finalized list below.

## Final remediation priority (revised)
| # | ID | Action | Effort | Impact |
|---|----|--------|--------|--------|
| 1 | S13 | Sweep 24 `console.error` → `Logger.error` + add ESLint rule | M | +100 % on a Core rule |
| 2 | S88 | Add CI guard for `skipped/` + `.release/` edits | S | Closes hardest-to-detect violation |
| 3 | S77 | `preinstall` script blocking framer-motion/gsap | S | Prevents Lovable-default footgun |
| 4 | S60 | `scripts/audit-timer-teardown.mjs` | M | Mirrors existing pattern |
| 5 | S81 | Collapse `.lovable/plan.md` → 1-line pointer to `plan.md` | XS | Removes SOT ambiguity |
| 6 | S95 | `scripts/check-coding-guidelines-coverage.mjs` | M | Closes 80 % doc gap |
| 7 | S27/S102 | Resolve OPFS drift (implement or update memory) | S–L | Removes the most concrete memory lie |
