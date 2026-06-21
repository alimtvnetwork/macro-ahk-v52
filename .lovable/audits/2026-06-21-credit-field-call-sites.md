# Credit-bar call-site audit — Plan.md Step 2 (v3.81.1)

**Created:** 2026-06-21
**Plan ref:** `.lovable/plan.md` Step 2 ("Audit call sites of raw credit fields")
**Memory enforced:** `mem://features/macro-controller/credit-balance-update` — `resolveCreditSummary(ws)` is the single source of truth for any UI number.

## Method

```
rg -n '\bws\.available\b|\bws\.totalCredits\b|\bws\.dailyLimit\b|resolveCreditSummary' \
  standalone-scripts/macro-controller/src --type ts -g '!__tests__'
```

Cross-checked every hit against the enforced list ("hover card, CSV, refill-priority, plus the progress-bar renderer added in v3.50.0"). Tagged each as **enrichment** (writes `ws.*` from authoritative source — fine), **resolver** (already uses `resolveCreditSummary` — fine), **legacy-direct** (reads raw `ws.*` to render a UI number — BUG candidate per RCA #1 in `.lovable/plan.md`), or **logging-only** (debug `log(...)` — low-risk, leave alone).

## Findings

### Enrichment writers (authoritative — leave alone)

| File:Line | Notes |
|---|---|
| `credit-balance/pro-one-enrichment.ts:30-34` | Writes `ws.totalCredits`, `ws.available`, `ws.totalCreditsUsed`, `ws.used`, `ws.dailyLimit` from `/credit-balance` row. |
| `credit-balance-update/credit-fetch-controller.ts:104-108` | Same write for the resolver fan-out path. |
| `pro-zero/pro-zero-enrichment.ts:36-51` | Pro_0 path. |
| `credit-parser.ts:215-240` | Inline list parser. |
| `workspace-status.ts:283-285` | Derives `ws.available / ws.totalCredits` from `freeGranted + dailyLimit + topupLimit` for legacy-shape rows. |

### Resolver consumers (correct contract)

| File:Line | Notes |
|---|---|
| `credit-totals.ts:37,96-97,115-121` | Already calls `resolveCreditSummary(ws)`; raw reads are inside the resolver-gated `if (resolveCreditSummary(ws).renderDash)` branch. |
| `credit-balance-update/credit-summary-resolver.ts:25-82` | The resolver itself — only place raw `ws.*` is allowed. |

### **Legacy-direct UI readers (BUG candidates — must migrate to resolver)**

These are the call sites that render a number/bar/sort key from `ws.available`, `ws.totalCredits`, or `ws.dailyLimit` WITHOUT going through `resolveCreditSummary(ws)`. They will show `0/0` for new-free / Lite / Cancelled workspaces because the on-demand `/credit-balance` fetch is only triggered when something asks the resolver:

| Severity | File:Line | Surface | Why it's a bug |
|---|---|---|---|
| 🔴 P0 | `ws-list-renderer.ts:455` | `EXPIRED_WITH_CREDITS` gate (`(ws.available \|\| 0) <= EXPIRED_WITH_CREDITS_MIN`) | Misclassifies new-free workspaces as expired-with-no-credits before any fetch fires. |
| 🔴 P0 | `ws-list-renderer.ts:466` | Filter `fs.minCredits` check (`(ws.available \|\| 0) < fs.minCredits`) | Filters out inline-empty workspaces that would have credits after the resolver fetch. |
| 🔴 P0 | `ws-list-renderer.ts:499` | Refill-priority score (`Math.max(ws.available \|\| 0, 0)`) | Refill score collapses to 0 → row sorts to bottom even when /credit-balance would return real credits. |
| 🔴 P0 | `ws-list-renderer.ts:724-756,774-775` | "Most-total-credits" + "most-available" sort comparators | Inline-empty rows lose every comparator. |
| 🔴 P0 | `ui/credit-totals-modal.ts:165-167, 233, 501-514` | Totals modal — Used / Remaining / Total columns + summary header | Pure resolver bypass; this IS the "progress bar shows 0" surface from the user report. |
| 🟠 P1 | `ui/summary-bar/compute-summary.ts:69-70,133-135` | Top-bar aggregate `proCreditsAvailable / proCreditsTotal` | Top bar shows wrong totals until every row is fetched; aggregation can't trigger the per-row fetch by itself. |
| 🟠 P1 | `ui/ui-status-renderer.ts:194-204` | Status panel `_totalCapacity` + `_availTotal` for the focused workspace | Falls back to `calcTotalCredits(...)` when `ws.totalCredits` is undefined, but never asks the resolver to fill it. |
| 🟠 P1 | `ws-hover-card.ts:422` | Hover card "Daily Free" line (`ws.dailyLimit \|\| ws.dailyFree \|\| 0`) | Hover card claims `daily=0` for inline-empty workspaces. |
| 🟡 P2 | `ui/projects-modal.ts:770-771` | Project task export (`task.ws.totalCreditsUsed`, `task.ws.totalCredits`) | One-shot export — acceptable to read raw if resolver was awaited earlier in the modal open flow (needs confirmation in Plan Step 3). |
| 🟡 P2 | `log-csv-export.ts:75,89,131` | CSV export columns | One-shot export; same caveat as projects-modal. |

### Logging-only (low-risk)

`ws-list-renderer.ts:281-295` (multi-line debug `log(...)`), `loop-controls.ts:125`, `credit-parser.ts:277-355,420` — these are diagnostic strings; numbers don't drive UI gates. Leave alone unless we want the log to match the resolver value (separate cosmetic ticket).

## Plan Step 3 implications

The progress-bar migration in `.lovable/plan.md` Step 3 must cover **at minimum** the 5 P0 surfaces in `ws-list-renderer.ts` + `ui/credit-totals-modal.ts`. The 3 P1 surfaces (summary-bar, ui-status-renderer, ws-hover-card) should land in the same PR because they share the same fix shape (`const summary = resolveCreditSummary(ws); use summary.available / summary.total / summary.source`). The P2 export paths can stay as-is provided the export entry point awaits the resolver fan-out from Step 4 before serialising — verify with a unit test.

## Gap vs memory

`mem://features/macro-controller/credit-balance-update` currently names **hover card, CSV, refill-priority** as enforced resolver consumers. After Plan Steps 3-4 ship, the memory needs the following appended to "Resolver is the single source of truth":

> **Enforced consumers** (all MUST go through `resolveCreditSummary(ws)`): workspace-list row renderer, credit-totals modal columns + header, refill-priority sort, top summary-bar aggregates, focused-workspace status panel, hover card, CSV export. **Forbidden:** any new file reading `ws.available` / `ws.totalCredits` / `ws.dailyLimit` for a UI number without the resolver.

## Outstanding questions

- Does `ui/projects-modal.ts:770-771` already await a resolver fan-out before serialising? (Plan Step 3 must confirm; otherwise promote to P1.)
- `workspace-status.ts:283-285` writes `ws.available = free + daily` for legacy-shape rows BEFORE the resolver runs. Plan Step 5 (`hasInlineCredits` zero-row tightening) needs to make sure this write doesn't make `hasInlineCredits()` return `true` for new-free rows and skip the fetch.
