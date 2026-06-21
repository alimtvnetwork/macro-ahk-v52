# Marco Chrome Extension v3.104.0

## Added

- Projects Modal Task 15 (final sweep): in-app `changelog-modal.ts` now lists
  every Projects Modal change shipped across v3.97.0, v3.99.0, v3.100.0,
  v3.101.0, and v3.102.0, so users see the full Projects Modal evolution
  inside the extension's Changelog dialog.
- `.lovable/plans/projects-modal-15-step-improvement.md` plan closed — all
  15 tasks shipped.

## Verification

- `node scripts/check-version-sync.mjs` → ✅ All versions in sync: 3.104.0.
- `bunx vitest run standalone-scripts/macro-controller/src/__tests__/projects-modal-csv.test.ts` → 1 file, 16 tests passed.
