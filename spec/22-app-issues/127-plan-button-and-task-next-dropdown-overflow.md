# Issue 127 — Prompts dropdown: missing Plan entry + Task Next dropdown opens left and overflows

**Status:** Queued
**Reporter:** User (screenshot 2026-05-30, clarification 2026-05-30)
**Target version:** v3.38.0 (bundled with Issues 124/125/126)
**Owner module:** `standalone-scripts/macro-controller/src/ui/` — `prompt-dropdown.ts`, `task-next-ui.ts`, `plan-task-ui.ts`

> **Scope clarification (from user 2026-05-30):**
> This issue is ENTIRELY about the **extension's Prompts button dropdown** — the popover that opens when the user clicks the blue **Prompts** pill we inject into Lovable's composer. It is NOT about Lovable's native composer Plan-mode button. Do not touch any native Lovable buttons.

---

## 1. What the Prompts dropdown should look like

When the user clicks the **Prompts** pill, a popover opens with two primary entries (and the existing prompt list / save controls):

```
┌─ Prompts dropdown ──────────────────┐
│  ⏭  Task Next        ▸              │  ← opens submenu to the RIGHT
│  📋  Plan            ▸              │  ← opens submenu to the RIGHT
│  ─────────────────────              │
│  (existing prompt list / save row)  │
└─────────────────────────────────────┘
```

Both **Task Next** and **Plan** are rows inside the Prompts dropdown. Hovering or clicking either one opens its sub-menu **to the right** of the Prompts dropdown (never to the left, never clipped).

---

## 2. Two concrete bugs to fix

### Bug A — `Plan` row is missing from the Prompts dropdown

The Plan sub-menu logic already exists in `src/ui/plan-task-ui.ts` (156 lines) and a test fixture exists at `src/__tests__/plan-task-ui.test.ts`, but the **entry point row inside `prompt-dropdown.ts` is no longer rendered** (regression — it used to be there).

**Fix:** Re-add the `Plan` row to the Prompts dropdown body, immediately below `Task Next`, with the same row styling. Wire its click/hover to the existing `openPlanTaskMenu()` (or equivalent exported function) in `plan-task-ui.ts`. If that function does not exist, expose it.

The Plan sub-menu's contents/behavior are defined by the existing `plan-task-ui.ts` module and its test — **do not redesign them**; only re-attach the entry row.

### Bug B — `Task Next` sub-menu opens leftward and gets clipped

Screenshot shows the **Task Next** sub-menu (Next 1/2/3/5/7/10/12/15/20/30/40 + Custom + Settings) anchored to the **left** of the Prompts dropdown, with its left edge cut off by the viewport at ≤ ~1043 px width.

**Fix:** Sub-menu must open **to the right** of the Prompts dropdown by default. If right-side space < menu width, fall back to opening downward (stacked under the row) — never leftward off-screen. Use the same anchoring approach the codebase already uses for other right-flank popovers (see `__tests__/tasks-right-anchor.test.ts` and `__tests__/tasks-toggle-hover-open.test.ts` — these tests already encode the right-anchor contract; Task Next is violating it).

Apply the same right-anchor rule to the **Plan** sub-menu so both are consistent.

---

## 3. Acceptance criteria

1. Clicking the **Prompts** pill shows both `Task Next` and `Plan` rows inside the dropdown.
2. Hover/click on `Task Next` opens its sub-menu to the right; all entries (Next 1 task … Next 40 tasks, Custom, Settings) are fully visible on a 1043 × 757 viewport.
3. Hover/click on `Plan` opens the existing Plan sub-menu (behavior unchanged from `plan-task-ui.ts`) — also to the right, fully visible.
4. Existing tests still pass: `tasks-right-anchor.test.ts`, `tasks-toggle-hover-open.test.ts`, `plan-task-ui.test.ts`, `prompts-panel-layout.test.ts`.
5. New test asserts the Plan row is rendered inside `prompt-dropdown.ts` output and that clicking it invokes the Plan sub-menu opener.
6. New test asserts Task Next sub-menu's computed `left` is `>= anchorRect.right` (i.e. opens rightward) on a 1043-px viewport when the Prompts pill is in the left half of the screen.

---

## 4. Files to touch

```
standalone-scripts/macro-controller/src/ui/
├── prompt-dropdown.ts          # Re-add Plan row; ensure both rows are wired
├── task-next-ui.ts             # Fix anchor calc to open RIGHT (not left)
├── plan-task-ui.ts             # Same right-anchor rule; export opener if needed
└── __tests__/
    ├── plan-row-in-prompts-dropdown.test.ts   # NEW
    └── task-next-right-anchor.test.ts         # NEW (or extend tasks-right-anchor)
```

Plus version bump in the queued v3.38.0 (with Issues 124/125/126).

---

## 5. Five-step task plan

1. **Repro + locate regression** — Read `prompt-dropdown.ts`, `task-next-ui.ts`, `plan-task-ui.ts`, and the existing `tasks-right-anchor` / `plan-task-ui` tests. Identify exactly where the Plan row was removed and where Task Next's anchor calc went wrong. Document the diff in a short comment block at the top of the spec (§6 below, leave a Findings stub).
2. **Bug B fix — Task Next right-anchor** — Update `task-next-ui.ts` so the sub-menu's `left = anchorRect.right + GAP` by default, falls back to stacked-below when right space is insufficient. Add `task-next-right-anchor.test.ts` covering both cases. Confirm `tasks-right-anchor.test.ts` still passes.
3. **Bug A fix — Re-add Plan row** — In `prompt-dropdown.ts`, render a Plan row directly below the Task Next row using the same row component/styling. Wire its `click`/`pointerenter` to the Plan sub-menu opener from `plan-task-ui.ts` (export it if missing). Apply the same right-anchor logic so the Plan sub-menu also opens rightward.
4. **Tests + regression sweep** — Add `plan-row-in-prompts-dropdown.test.ts` (asserts row exists, has correct label/icon, opener fires). Run the full test suite; fix any fallout. Visual sanity check via screenshot at 1043 × 757.
5. **Version bump + changelog** — Roll into v3.38.0 with entries: "Restored missing Plan row in Prompts dropdown", "Fixed Task Next sub-menu opening leftward and clipping at narrow viewports".

---

## 6. Findings (filled in during Task 1)

_TBD — populate during repro step._

---

## 7. Non-goals

- Do **NOT** touch Lovable's native composer Plan-mode button or any native composer DOM.
- Do **NOT** redesign the Task Next or Plan sub-menu contents — only their anchoring and the missing entry row.
- Do **NOT** add a new global "mode selector" — the previous spec draft misread the request; that idea is withdrawn.
