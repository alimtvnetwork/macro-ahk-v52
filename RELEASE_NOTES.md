# Marco Chrome Extension v3.87.0

## Added

- `credit-refresh-component.test.ts` covers Plan 01 Step 8c end-to-end: click 💰 Credits on a new-free workspace, fan out to `/credit-balance`, repaint after `CreditResolved`, and assert a non-zero rendered progress bar.

## Changed

- `renderCreditBar()` now exposes `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` while preserving the existing visual credit-bar HTML.

## Verification

- Before: helper regressions passed but no test proved the real click-to-DOM repaint path.
- After: `bunx vitest run standalone-scripts/macro-controller/src/__tests__/credit-refresh-component.test.ts` → **1/1 passed**.
- Targeted suite: credit fan-out / placeholder / network-count / component regressions → **4 files, 12 tests passed**.
- `node scripts/check-version-sync.mjs` → `✅ All versions in sync: 3.87.0`.
