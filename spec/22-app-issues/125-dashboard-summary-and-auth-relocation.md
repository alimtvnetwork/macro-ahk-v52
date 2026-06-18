# Issue 125 — Dashboard Summary Bar, Auth Relocation & Expire Badge Color Fix

**Version target:** v3.38.0 final queued bump after Issue 126 is implemented.
**Owner modules:** UI panel (TS Macro Controller), `auth-diagnostics`, workspace list filter pipeline, `workspace-badge` classifier.

---

## 1. Problems

1. **`Auth Diagnostics` section takes prime dashboard real estate.** It should be moved into the `Tools & Logs` accordion and hidden by default.
2. **No at-a-glance portfolio summary.** User cannot see at a glance how many Pro workspaces, how many are about-to-expire, and how much paid + free credit is available across the visible set.
3. **Expire badge color is wrong.** Currently rendered with a tone that conflicts with `mem://features/macro-controller/workspace-badge-display` (canceled = muted gray; expire-soon should be amber, NOT red).
4. **Summary is static.** When the user applies a filter (search, `Refill-soon`, `All`, etc.) the summary numbers must recompute against the **currently visible** workspace list, not the global set.

## 2. Behaviour contract

### 2.1 Auth Diagnostics relocation

- Remove the `[+] 🛡 Auth Diagnostics` row from its current top-level position (between the action buttons and the Workspaces accordion).
- Mount the same component as a collapsed child inside the existing `[+] 🛠 Tools & Logs` accordion.
- Default state: **collapsed**. User preference persisted under `Ui.ToolsLogs.AuthDiagExpanded` (default `false`).
- No functional change to the Auth Diagnostics component itself — only its mount location.

### 2.2 Dashboard summary bar

Insert a new compact summary strip directly below the title row (`TS Macro / macro-ahk-v50 / v3.x` line) and above the action buttons (`Check / ⏹ / Credits / Prompts / ⚠ / ☰`). The strip shows three pills:

| Pill | Label | Value source |
|------|-------|--------------|
| 🪪 **Pro** | `N Pro` + `(M exp)` | N = count of visible workspaces where `plan` starts with `pro_`; M = subset of N where `badge.kind ∈ { 'expire', 'expire-soon', 'canceled' }` |
| 💳 **Pro Credits** | `Available / Total` | Sum across visible Pro workspaces using `aggregateCreditTotals()` **with FREE tier excluded** (per `mem://features/macro-controller/credit-totals-exclude-free`) |
| ⚡ **Free Credits** | `Available` | Sum of `dailyFree` (or equivalent) across all visible workspaces; FREE-only |

Visual rules:
- 3 pills in a horizontal flex row, equal flex-grow, single line, truncate on overflow.
- Each pill uses the existing dark-theme token set: `bg-muted/40`, `border-border`, `text-foreground`, accent icon color matches its semantic.
- Click a pill → toggles the matching filter chip (Pro pill → `plan:pro`; Pro Credits pill → no-op for now; Free Credits pill → `tier:free`).

### 2.3 Filter-reactive recomputation

- The summary subscribes to the same `visibleWorkspaces$` selector that drives the workspace list. Any filter change (search box, `All` toggle, `Refill-soon`, `Focus Current`, plan filter, etc.) must trigger a single recompute of the three pills within one render frame.
- No throttling needed for typical 439-row catalogs; the aggregate is O(n) and runs on filtered list (≤ 439 items).
- Implementation: single pure function `computeDashboardSummary(visible: WorkspaceRow[]): DashboardSummary` consumed by a memoized selector keyed on the visible array identity.

### 2.4 Expire badge color fix

Per `mem://features/macro-controller/workspace-badge-display`:

| Badge kind | Required tone | Token |
|------------|---------------|-------|
| `expire` (already expired) | muted red-orange, NOT pure red | `--badge-expired-fg` / `--badge-expired-bg` |
| `expire-soon` (≤ 4 days) | amber | `--badge-warning-fg` / `--badge-warning-bg` |
| `canceled` | muted gray | `--badge-muted-fg` / `--badge-muted-bg` |
| `refill-soon` | amber-accent (existing) | unchanged |

Current bug: `Expire` chip is rendering with the same red as critical alerts. Fix the classifier-to-tone resolver so the three states above each map to the correct token. Add a snapshot test asserting `canceled !== red` and `expire-soon === amber`.

## 3. Files touched

```
standalone-scripts/macro-controller/src/
  ui/
    panel.ts                              # remove Auth Diagnostics top mount; add SummaryBar mount point
    summary-bar/
      index.ts                            # SummaryBar component
      compute-summary.ts                  # pure computeDashboardSummary()
      types.ts                            # DashboardSummary
      __tests__/compute-summary.test.ts   # unit tests for the aggregator
    tools-logs/
      index.ts                            # mount Auth Diagnostics as collapsible child
  workspace-badge/
    classifier.ts                         # tone fix for expire / expire-soon / canceled
    __tests__/classifier-tone.test.ts     # add cases asserting correct token per kind
```

## 4. Aggregator contract

```ts
// summary-bar/types.ts
export interface DashboardSummary {
  proCount: number;                 // visible workspaces with plan startsWith 'pro_'
  proExpiringCount: number;         // subset with badge.kind in expire/expire-soon/canceled
  proCreditsAvailable: number;      // sum, FREE excluded
  proCreditsTotal: number;          // sum, FREE excluded
  freeCreditsAvailable: number;     // sum of daily free remaining
}

// summary-bar/compute-summary.ts
export function computeDashboardSummary(rows: WorkspaceRow[]): DashboardSummary;
```

Edge cases:
- Empty visible list → all zeros; pills render `0 Pro`, `0 / 0`, `0`.
- Workspace with `plan === 'free'` → contributes ONLY to `freeCreditsAvailable`; never to Pro counters.
- `pro_0` uses authoritative `/credit-balance` overlay (per `mem://features/macro-controller/pro-zero-credit-balance`) — already handled upstream; the aggregator just reads `available` / `totalCredits` from the enriched row.

## 5. Tests (ship with feature)

- `compute-summary.test.ts` — empty list; pro-only mix; mixed pro + free; pro_0 enriched row; expire vs expire-soon counted in `proExpiringCount`; FREE rows excluded from Pro credit totals.
- `classifier-tone.test.ts` — `expire-soon` → amber token; `canceled` → muted gray (NOT red); `expire` → red-orange (NOT critical red).
- `panel.integration.test.ts` — Auth Diagnostics is NOT a direct child of the panel root; IS a child of Tools & Logs; default collapsed. SummaryBar renders three pills and updates when the visible-workspaces store changes.

## 6. Acceptance

- [ ] `Auth Diagnostics` no longer appears at top level; it is inside `Tools & Logs`, collapsed by default.
- [ ] Summary bar shows three pills below the title row.
- [ ] Numbers update within one frame after any filter change (search, chips, Focus Current, etc.).
- [ ] `Expire`, `Expire-soon`, and `Canceled` badges each render with the correct distinct token (no false red on canceled).
- [ ] All three new test files pass.
- [ ] Version bump v3.38.0, changelog entry after Issue 126 is also complete.

---

## 5-step task plan

1. **Spec** *(this turn)*: this document.
2. **`summary-bar` module + unit tests**: `compute-summary.ts`, `types.ts`, component shell, `compute-summary.test.ts`.
3. **Panel wiring + Auth Diagnostics relocation**: mount SummaryBar; move Auth Diagnostics into Tools & Logs as collapsed child; `Ui.ToolsLogs.AuthDiagExpanded` pref; `panel.integration.test.ts`.
4. **Filter-reactive subscription**: hook SummaryBar to `visibleWorkspaces$` selector; verify O(n) recompute per filter change.
5. **Expire badge tone fix**: classifier patch and `classifier-tone.test.ts`.
6. **Ctrl+Shift+Down attach regression**: implement Issue 126 (`spec/22-app-issues/126-ctrl-shift-down-script-attach-shortcut.md`) with shortcut attach/injection regression tests.
7. **Final version bump v3.38.0**: manifest + constants + changelog after Issues 125 and 126 are complete.
