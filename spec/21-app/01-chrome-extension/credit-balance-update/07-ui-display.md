# 07 — UI Display Updates

## Per-row credit cell (Workspace list + Credit Totals modal)

When the source is the credit-balance API, render:

```
{totalRemaining} / {totalGranted}     ← primary (matches existing "Available / Total")
└─ daily {dailyRemaining}/{dailyLimit}  ← secondary line, muted color
```

For Ktlo / Free / Cancelled when **no** credit data could be obtained at all,
render `—` (em dash) instead of `0/0` so the user can distinguish "unknown"
from "zero".

## Tooltip (singleton hover card, see `mem://features/macro-controller/workspace-tooltip-members-popup`)

Add a new section under "Credits":

```
Total remaining   {totalRemaining}
Total granted     {totalGranted}
Daily remaining   {dailyRemaining} / {dailyLimit}
Billing used      {totalBillingPeriodUsed}
Source            Inline | API | Cached | Timeout
Fetched           {relative time}
```

## Refill-soon filter

`workspace-refill-priority.ts` already uses `available` and `total`. For the
plans covered by this spec, `available = totalRemaining` and
`total = totalGranted` (or `dailyLimit` when `totalGranted = 0`, e.g. pure
Free accounts). Codified in `credit-summary-resolver.ts`.

## Colour tokens (memory `dark-only-theme`)

- Source = `Inline` → existing tokens (unchanged).
- Source = `API` → unchanged tokens.
- Source = `Cached` → muted (`text-muted-foreground`).
- Source = `Timeout` → amber tone (`--credit-status-warning`), same one already
  used for "Refill soon".

No new colour hex values; reuse existing CSS variables.
