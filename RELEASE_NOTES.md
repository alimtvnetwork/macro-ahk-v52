# Marco Chrome Extension v3.88.0

## Changed

- Plan 01 Step 9 — `/credit-balance` failure log schema lock. `CreditFailureLogPayload` renamed `Path` → `SourceUrl` so every `Logger.error('CreditBalanceUpdate.fetch', …)` entry matches the mandated keys (`Reason`, `ReasonDetail`, `WorkspaceId`, `BearerPrefix`, `ElapsedMs`, `SourceUrl`).

## Added

- `credit-fetch-failure-schema.test.ts` — 5-test regression covering MissingToken / AuthError-401 / Http5xx / NetworkError paths, asserting full schema presence, BearerPrefix redaction, and that the legacy `Path` key is gone.

## Verification

- Before: payload still emitted `Path`, so Step 9 of Plan 01 was unverified.
- After: `bunx vitest run …/credit-fetch-failure-schema.test.ts …/credit-balance-fetcher.test.ts` → **2 files, 9 tests passed**.
- `node scripts/check-version-sync.mjs` → `✅ All versions in sync: 3.88.0`.
