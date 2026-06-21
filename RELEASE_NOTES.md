# Marco Chrome Extension v3.82.0

## Fixed

- Credit UI now reads `resolveCreditSummary(ws)` consistently across workspace-list filters/sorts, list row scaling, Credit Totals modal cells/sorts/filters, summary-bar aggregates, focused-workspace status bar, and hover-card daily credit display.
- New Free, Lite/Ktlo, and Cancelled workspaces with `/credit-balance` cache data no longer remain visually stuck at `0/0` in legacy raw-field UI surfaces after clicking 💰 Credits.

## Verification

- Added targeted regression coverage for resolver-backed credit cells, filters, sorts, and summary totals.