---
name: plan-task-ux-20-step
description: Closed-out 20-step Credit Totals + Macro UX plan (2026-05-25) — final UX contract for Plan Task, Task Next, Credit Totals modal, and no-autorun guard
type: feature
---

## 20-Step Plan — Closed-Out Contract

**Source plan:** `.lovable/plans/credit-totals-and-macro-ux-20-step.md`
**Ambiguity log:** `.lovable/question-and-ambiguity/01-credit-totals-and-macro-ux.md`
**Status:** Shipped — every Step 1–20 fix landed with matching tests
(per `mem://preferences/test-with-features`). Do NOT re-derive or
re-litigate these decisions; treat the rules below as load-bearing.

### A. Plan Task button (Steps 1–3)
- Opener lives in `standalone-scripts/macro-controller/src/ui/plan-task-ui.ts`
  and MUST stay exported (`openPlanTaskMenu` / `renderPlanTaskSubmenu`).
- Submenu must NOT collapse on `mouseleave` until a real outside-click.
- All custom-step parsing uses explicit `parseInt(value, 10)` — radix
  is mandatory (eslint enforced).
- Plan row is rendered inline in the Prompts dropdown body, directly
  below Task Next (Issue 127). Re-removal is a regression.

### B. Task Next + Plan Task placement (Step 4, Issue 127)
- Both controls render in a right-anchored floating panel attached to
  the prompts dropdown's right edge — never stacked inline above the
  prompts list.
- Hidden by default; toggled by the `🎯 Tasks` header button.
- Invariant tests: `tasks-right-anchor.test.ts`,
  `tasks-toggle-hover-open.test.ts`, `plan-row-in-prompts-dropdown.test.ts`,
  `prompts-panel-layout.test.ts`.

### C. Macro Controller no-autorun guard (Steps 5–6)
- Loop engine + auto-cycle require an explicit user gesture
  (`autoStartAllowed` flag, gated at `loop-engine.ts` entry).
- Dashboard / payment-banner-hider / other helper scripts MAY auto-run —
  only the macro loop is gated.
- Any code path that triggers a loop without the gesture MUST log
  CODE-RED per `mem://standards/error-logging-requirements.md`.

### D. Credit Totals modal (Steps 7–13)
- Base font 12/11px (bumped from 10/9px). No inline hex — use existing
  tokens.
- Numeric column colour rules:
  - `Used` → amber
  - `Rem` → green, switch to cyan when `≤ 5`
  - `Total` → muted blue
  - `Plan` badge → existing tone classifier from
    `mem://features/macro-controller/workspace-badge-display`
- Row hover + zebra striping via tokens only.
- Sortable headers (Workspace, Plan, Used, Rem, Total); last sort
  persisted to `chrome.storage.local`. Sorting clears manual drag order
  with a confirmation chip.
- Drag-drop reorder via native HTML5 DnD; persisted under
  `creditTotalsRowOrder` (array of workspace IDs).
- Filter chips reuse `workspace-refill-priority.ts` predicates —
  do NOT fork the logic.
- `PROJECTS` count column backed by `projects-cache.ts`; double-click
  a row expands an inline projects sub-panel (lazy-loaded).
- CSV button lives in the modal footer next to Refresh/Close and
  exports the current filtered + sorted view via the
  `log-csv-export.ts` pattern.

### E. Tests (Steps 14–16, 19)
- Unit + component + E2E coverage is mandatory for every UX item above.
- E2E credit-totals modal round-trip
  (`tests/e2e/e2e-credit-totals-modal.spec.ts`) stays `fixme` until the
  content-script harness lands — its network half is already wired via
  `tests/e2e/utils/credit-balance-stub.ts` +
  `tests/e2e/fixtures/credit-balance/workspaces.ts`.

### F. Prompts panel layout (Steps 17–18, 20)
- Next-task list MUST NOT overlap the prompts panel or Errors badge;
  reanchor + z-index + `max-height` with scroll.
- Re-anchor invariants covered by `prompts-panel-layout.test.ts`.

## Why this is a memory (not just changelog)
Re-implementing any of the above (auto-running the loop, moving Task
Next back inline, dropping the Plan row, recolouring Credit Totals,
removing the no-autorun gate) is a regression — multiple Issues
already burned these rules in (113, 120, 127). Treat as load-bearing.
