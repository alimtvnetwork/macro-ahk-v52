# Marco Chrome Extension v3.101.0

## Fixed

- Projects Modal Task 13: CSV exports now write `—` for missing
  `lastCommunication` values instead of leaking blank values or Lovable's
  upstream `(no data returned by API)` placeholder.
- Added export observability: when cleanup happens, the activity log records
  `Projects: CSV lastCommunication normalized for N row(s)`.

## Changed

- Advanced `.lovable/plans/projects-modal-15-step-improvement.md` to Task 14 —
  end-to-end SQLite cache verification.

## Verification

- `bunx vitest run standalone-scripts/macro-controller/src/__tests__/projects-modal-csv.test.ts` → expected 1 file, 13 tests passed.
- `node scripts/check-version-sync.mjs` → expected ✅ All versions in sync: 3.101.0.
