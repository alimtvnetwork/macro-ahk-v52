# Marco Chrome Extension v3.96.0

## Changed

- **Hover-card plan chip + sub-header now use the canonical
  `formatPlanDisplayLabel()` helper.** Reads `Pro 1`, `Light 2`, `Lite`
  instead of the legacy uppercased `tier` bucket (`PRO`, `FREE`).
- **Summary-bar `isProPlan` documented as strict-`pro_*`-only.**
  Lite-tier workspaces are intentionally excluded from the Pro pill
  aggregates; documented so the next refactor doesn't widen it.
- **Memory rule added**: `mem://features/macro-controller/plan-display-label`.

## Files changed

- `standalone-scripts/macro-controller/src/ws-hover-card.ts`
- `standalone-scripts/macro-controller/src/ui/summary-bar/compute-summary.ts`
- `.lovable/memory/features/macro-controller/plan-display-label.md` (new)
- `.lovable/memory/index.md`
- Test snapshots: `__tests__/__snapshots__/ws-hover-card.snapshot.test.ts.snap`

## Verification

- `bunx vitest run plan-mapper credit-totals-csv credit-totals-modal ws-hover-card.snapshot`
  → **4 files, 72 tests passed**.
- `node scripts/check-version-sync.mjs` → ✅ All versions in sync: 3.96.0.

---

(See `changelog.md` for full history.)
