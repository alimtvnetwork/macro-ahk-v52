# Marco Chrome Extension v3.89.0

## Changed

- Plan 01 Step 10 close-out: `mem://features/macro-controller/credit-balance-update` now reflects the full v3.88.0 failure-log schema (`SourceUrl`, 9 Reason codes, 12-char `BearerPrefix` redaction) and cites `credit-fetch-failure-schema.test.ts` as the enforcer.

## Verification

- `node scripts/audit/check-must-memory-refs.mjs` → OK (every MUST/SHALL cites a `mem://` owner).
- `node scripts/audit/check-quarantine.mjs` → OK.
- `node scripts/audit/check-score-floor.mjs` → OK (composite 100 ≥ 99.5).
- `bunx vitest run` on credit-fetch-failure-schema + balance-fetcher + new-free-network-count + placeholder-bar + refresh-component + button-fanout → **6 files / 21 tests passed**.
- `node scripts/check-version-sync.mjs` → `✅ All versions in sync: 3.89.0`.
