# 17 — Test Plan (Integration / Component)

JSDOM + component tests.

## Settings panel
- Renders the new slider with default 3000 ms.
- Drag → `SAVE_SETTINGS` dispatched with coerced value.
- Out-of-range value entered manually → coerced + Logger.warn.

## Workspace row
- Ktlo workspace with API result `{totalRemaining:5,totalGranted:5,daily:5/5}` →
  primary cell shows `5 / 5`, secondary shows `daily 5/5`.
- Cancelled workspace with no result → cell shows `—`, tooltip shows
  `Source: Timeout` and last-fetched time.

## Credit Totals modal
- Filter "Refill-soon" includes Ktlo workspaces resolved via API.
- CSV export contains `totalRemaining`, `totalGranted`, `dailyRemaining`,
  `dailyLimit`, `source` columns.

## Tooltip singleton
- Hover Ktlo row → tooltip shows the new Credits section.
- Hover then move → no flicker; pin (🛈) keeps card open
  (memory `mem://features/macro-controller/post-move-credit-sync`).
