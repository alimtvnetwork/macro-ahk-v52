# RCA — `🧠 Plan Task` button "doesn't work properly"

Date: 2026-05-25  ·  Reporter: user  ·  Module: `standalone-scripts/macro-controller/src/ui/plan-task-ui.ts`

## Reproduction
1. Open Lovable dashboard (or any page where the project editor is NOT mounted).
2. Open Macro Controller → Prompts dropdown → click `🧠 Plan Task`.
3. Click `Plan in 10 steps` (or any preset / custom).
4. Observed: dropdown closes; either nothing visible happens or a brief red error toast flashes by; the planned prompt is not in the editor.

Secondary repro (menu collapse):
1. Open `🧠 Plan Task` sub-accordion.
2. Slowly move mouse from header `🧠 Plan Task` row toward a preset; if the pointer crosses the panel border for >120 ms, the sub silently collapses; click on a row that just disappeared is lost.

## Root causes (confirmed)

### RC-1 — Double / contradictory toasts mask success
`pasteIntoEditor` (prompt-utils.ts L233–245) **already** shows its own toast(s) when no editor target exists:
- success path: `📋 Copied to clipboard — paste manually with Ctrl+V`
- failure path: `❌ Could not paste or copy — editor target not found`

But it returns `false` **even when the clipboard fallback succeeded**. `plan-task-ui.ts` L52–54 then adds a second toast: `❌ Plan prompt: editor not found`. Result: user sees a red "failed" toast on top of a successful clipboard copy — concludes "button is broken" while the prompt is actually in the clipboard.

### RC-2 — `injectPlanPrompt` discards the real outcome
Caller cannot distinguish:
- editor found + paste OK,
- no editor + clipboard OK (still useful),
- no editor + clipboard failed.
All three collapse into one boolean, then a misleading error toast is appended.

### RC-3 — 120 ms `onmouseleave` auto-collapse races with click
`plan-task-ui.ts` L101: `item.onmouseleave = function() { setTimeout(... 120) }`. On any mouse jiggle that briefly leaves `item` (e.g. crossing the 1px purple border) the sub is hidden 120ms later — a click that lands on the now-hidden preset row produces no effect. There is no equivalent on `dropdown` itself, so other prompt rows do not have this problem.

### RC-4 — `parseInt` without radix
`plan-task-ui.ts` L145: `parseInt(inp.value)` — no explicit `10`. Inputs like `08`, `0x10` behave differently across engines; also violates `radix` lint rule.

### RC-5 — Dropdown closed before paste runs (cosmetic)
L121/147: `dropdown.style.display = 'none'` runs **before** `injectPlanPrompt`. By the time clipboard / inject toasts appear, the user has lost the visual cue that their click was on Plan Task. Minor, but compounds RC-1 confusion.

## Severity & priority
- RC-1 + RC-2: P0 — user-facing "broken button" perception.
- RC-3: P1 — intermittent click loss.
- RC-4: P2 — lint + edge-case parsing.
- RC-5: P3 — UX polish.

## Fix outline (executed in Step 2)
1. Change `pasteIntoEditor` return to a discriminated result `{ ok, mode: 'injected'|'clipboard'|'failed', chars }` (or simpler: a 3-state string). Suppress duplicate toasts in caller.
2. In `plan-task-ui.ts`, only show a caller-side toast when `pasteIntoEditor` returned `'failed'` — let the success / clipboard toasts from `prompt-utils` stand.
3. Remove the 120ms `onmouseleave` auto-collapse; rely on outside-click handler already wired in `prompts-dropdown.ts` (consistent with the rest of the menu).
4. `parseInt(inp.value, 10)`.
5. Move `dropdown.style.display = 'none'` to AFTER `injectPlanPrompt` returns.

## Regression-test coverage (Step 3)
- Unit: `buildPlanTaskPrompt(5|10|15|99)` text shape.
- Component (JSDOM):
  - clicking preset row with editor mounted → inject called once, success toast only.
  - clicking preset row with NO editor → clipboard toast only, NO red "editor not found".
  - mouseleave then click within 120ms → click still fires (no auto-collapse).
  - custom input `"08"` → parsed as 8, not 0.
- E2E: load extension on lovable.dev project page → open Plan Task → click "Plan in 10 steps" → assert editor contains `## **10** steps Plan`.
