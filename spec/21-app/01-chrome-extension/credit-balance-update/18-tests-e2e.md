# 18 — Test Plan (E2E)

Playwright, under `tests/e2e/`.

## `e2e-credit-balance-ktlo.spec.ts`

1. Load extension on `https://lovable.dev/`.
2. Stub `GET /workspaces` to return one Ktlo workspace with NO inline credits.
3. Stub `GET /workspaces/{id}/credit-balance` to return the sample payload.
4. Open the macro controller panel → row shows `5 / 5`.
5. Hover row → tooltip "Source: API", "Fetched: just now".
6. Network log shows exactly **one** call to `/credit-balance` per workspace
   per refresh window.

## `e2e-credit-balance-timeout.spec.ts`

1. Stub `/credit-balance` with a 10 s delay.
2. Lower the slider to 1000 ms.
3. Row shows `—`, tooltip "Source: Timeout".
4. Increase slider to 12000 ms, click Refresh → row updates to `5 / 5`.

## `e2e-credit-balance-no-fetch-when-inline.spec.ts`

1. Stub Pro1 workspace with inline credit fields.
2. Assert **zero** calls to `/credit-balance`.

## Network assertions

Use the existing `tests/e2e/reporters/extension-artifacts-reporter` to confirm
URL count + body shape.
