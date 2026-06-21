# Marco Chrome Extension v3.100.0

## Added

- Projects Modal Task 12: credits-used min/max numeric filter in the Projects
  dialog filter rail. Workspaces whose `used` credits fall outside the
  inclusive `[min, max]` range are hidden before per-row filtering.
- "No projects match your filters" panel now reports the active credits range
  alongside the other filter chips.
- Clear all filters resets the credits range inputs together with search,
  open-in-tab, has-repo, and workspace chips.

## Changed

- Advanced `.lovable/plans/projects-modal-15-step-improvement.md` to Task 13 —
  replace `(no data returned by API)` rows with `—`.

## Verification

- `bunx vitest run standalone-scripts/macro-controller/src/__tests__/projects-modal-csv.test.ts` → 1 file, 10 tests passed.
- `node scripts/check-version-sync.mjs` → expected ✅ All versions in sync: 3.100.0.
