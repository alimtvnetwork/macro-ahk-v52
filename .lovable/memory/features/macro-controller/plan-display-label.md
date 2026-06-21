---
name: plan-display-label
description: Canonical formatter `formatPlanDisplayLabel(plan)` is the single source of truth for human-readable wire-plan labels (badge, hover card, Credit Totals modal, CSV export)
type: feature
---
# Plan display label — canonical formatter (v3.95.0+)

`formatPlanDisplayLabel(plan)` in
`standalone-scripts/macro-controller/src/credit-balance-update/plan-mapper.ts`
is the **only** function allowed to translate a wire `plan` string into
user-facing text. Every UI surface that renders a plan MUST delegate to
it — do NOT reintroduce inline regexes, `toUpperCase()`, or `ws.plan ||
'—'` patterns.

## Mapping

| Wire plan        | Rendered label |
|------------------|----------------|
| `ktlo_<N>`       | `Light <N>`    |
| `ktlo`, `lite`   | `Lite`         |
| `pro_<N>`        | `Pro <N>`      |
| `free`           | `Free`         |
| `cancelled` / `canceled` | `Cancelled` |
| `business`       | `Business`     |
| `enterprise`     | `Enterprise`   |
| empty / null     | `''` (caller picks fallback, typically `—`) |
| unknown          | the raw token verbatim (so support spots new tiers) |

## Required call sites

- `ws-list-renderer.ts → resolveTierBadgeLabel()` — workspace dropdown badge.
- `ws-hover-card.ts → planChipHtml()` and `buildSubHeader()` — hover card.
- `ui/credit-totals-modal.ts` — both the modal Plan cell and the CSV Plan
  column (`generateCsv`).

## Forbidden patterns (regression markers)

- `ws.plan.toUpperCase()` — always wrong for display.
- `ws.plan || '—'` — bypasses the formatter; produces inconsistent labels.
- Inline `/^ktlo_(\d+)$/` or `/^pro_(\d+)$/` regex anywhere outside
  `plan-mapper.ts` — duplicate logic, will drift.

## Sort / filter exception

Internal sort comparators and filter predicates that need the raw wire
token (e.g. `'pro_0'` for cohort matching) MAY keep reading `ws.plan`
directly. Only DISPLAY text goes through `formatPlanDisplayLabel`.

## Tests

`__tests__/plan-mapper.test.ts` parameterises 18 cases of
`formatPlanDisplayLabel` plus `ktlo_2` / `ktlo_3` / `KTLO_2` in
`mapPlanFromWire`. Run via
`bunx vitest run plan-mapper credit-totals-csv credit-totals-modal`
when touching any of the call sites above.

## Summary-bar caveat

`ui/summary-bar/compute-summary.ts → isProPlan()` is a SEPARATE concern
and stays strict (`pro_*` only). Lite-tier workspaces (`ktlo_*`) are
intentionally excluded from `DashboardSummary` aggregates; widening
that predicate would double-count credits. The display label and the
"Pro" cohort predicate are not interchangeable.
