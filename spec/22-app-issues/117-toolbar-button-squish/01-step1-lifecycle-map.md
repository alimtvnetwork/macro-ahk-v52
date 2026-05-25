# Issue 117 — Step 1: Reproduce & Map the Minimize → Expand Lifecycle

**Date:** 2026-05-25
**Plan:** `.lovable/plan.md` → Issue 117 (5-step plan)
**Goal of Step 1:** capture the exact DOM / inline-style / class delta that happens to the
button row when the user clicks `[ - ]` then `[ + ]`, so Step 2 can pinpoint root cause.

---

## 1. Reproduction recipe

1. Inject Macro Controller into a Lovable workspace (any width — bug is most visible in a
   narrow Lovable sidebar, ~480–520px).
2. Wait for the panel to dock (redock observer flips `floating → docked`).
3. Click the `[ - ]` toggle in the title bar → panel collapses (body rows hidden, only title row visible).
4. Click the `[ + ]` toggle → panel re-expands.
5. **Observed:** the button row (Check · ▶ · Credits · Prompts · Errors · ☰) renders with
   the buttons visually flush against each other ("squished"), even though the inline
   `gap:10px` + `margin:2px 3px` from `panel-controls.ts` is still on the element.
6. **Expected:** the button row looks identical to its pre-minimize state.

---

## 2. Code paths involved

| Concern                  | File                                    | Notes |
|--------------------------|-----------------------------------------|-------|
| Toggle handler           | `src/ui/panel-layout.ts` `toggleMinimize` (L404–442) | mutates `ui.style.height/maxHeight/overflow/overflowY` and toggles `display` on every `bodyElements[]` entry |
| Title-bar click wiring   | `src/ui/panel-header.ts` `_setupTitleDragHandlers` (L117–128) | `onpointerup` calls `toggleMinimize(plCtx)` when click is not a drag |
| Button row construction  | `src/ui/panel-controls.ts` `buildButtonRow` (L102–184) | sets `display:flex;gap:10px;row-gap:10px;flex-wrap:wrap;padding:8px 10px 10px;width:100%;max-width:100%;min-width:0;overflow:visible` |
| Per-button style         | `src/ui/panel-controls.ts` L139 | `flex:0 0 auto;white-space:nowrap;margin:2px 3px` |
| Viewport clamp           | `src/ui/panel-layout.ts` `keepPanelInViewport` (L62–96) | may shrink `ui.style.width` if rect exceeds viewport |
| Redock                   | `src/ui/redock-observer.ts` `tryRedock` (L97–133) | moves `#loop-macro-container` from `body` into Lovable's controls XPath target |
| Persistence              | `savePanelState` / `loadPanelState` (L18–24) | only persists `'expanded' | 'minimized'`, NOT geometry per cycle |

---

## 3. Inline-style delta (manual trace)

### Before minimize (expanded baseline, panel docked into Lovable sidebar)

```
#loop-macro-container          height: 760px   maxHeight: ""   overflow: ""        overflowY: ""
  .title-row                   display: flex   gap: 6px        flex-wrap: nowrap
  .body...                     display: ""     (visible)
  .btn-row                     display: flex   gap: 10px       padding: 8px 10px 10px
    button × 6                 margin: 2px 3px flex: 0 0 auto  white-space: nowrap
```

### After clicking `[ - ]` (minimized)

`toggleMinimize` does (L406–424):
```
expandedHeight      ← ui.style.height       = "760px"
expandedMaxHeight   ← ui.style.maxHeight    = ""
expandedOverflow    ← ui.style.overflow     = ""
expandedOverflowY   ← ui.style.overflowY    = ""
bodyElements[i].style.display = 'none'      # btn-row, sections, hot-reload, etc. hidden
ui.style.height     = "auto"
ui.style.maxHeight  = ""
ui.style.overflow   = "visible"
ui.style.overflowY  = "visible"
panelToggleSpan.textContent = "[ + ]"
panelState = "minimized"
```

The button row itself is `display:none` at this point — its own inline styles are untouched.

### After clicking `[ + ]` (re-expanded)

`toggleMinimize` does (L425–438):
```
bodyElements[i].style.display = ''          # restored — empty string → CSS default
ui.style.height     = expandedHeight        # "760px"
ui.style.maxHeight  = expandedMaxHeight     # ""
ui.style.overflow   = expandedOverflow      # ""
ui.style.overflowY  = expandedOverflowY     # ""
panelToggleSpan.textContent = "[ - ]"
panelState = "expanded"
```

→ The btn-row regains `display: ""` (i.e. its CSS default of `flex` via inline style).

---

## 4. Where the squish comes from — three candidate root causes

These are hypotheses to verify in Step 2; **none is confirmed yet**.

### Hypothesis A — Lost flex `display` after `display:none → display:""`

`btn-row` was built with an inline `display:flex` (part of the L130 `cssText`). When
`toggleMinimize` sets `el.style.display = 'none'` and later `el.style.display = ''`,
the **inline `display:flex` is destroyed** (overwritten by `'none'`) and on restore
becomes the empty string — which falls back to the element's tag default (`block` for
`<div>`), NOT the original `flex`.

If true: every flex-only style on btn-row (`gap`, `flex-wrap`, `align-items`,
`justify-content`) becomes a no-op after expand, so children stack as inline blocks
with only the per-button `margin:2px 3px` separating them → visually squished.

**This is the strongest candidate** because it matches the symptom exactly: gap
disappears, buttons sit nearly flush except for the 2px+3px margin (which is
roughly what users have reported as "squished").

### Hypothesis B — `expandedHeight` captured while a redock was mid-flight

If the user minimizes during the brief window where `redock-observer` is still polling
or has just set `transition: box-shadow 0.4s` (L118), then `expandedHeight` may be
snapshotted from a transient state. Less likely cause of horizontal squish, but worth
checking — could explain reports of "row height also wrong".

### Hypothesis C — `bodyElements[]` includes btn-row's WRAPPER but not btn-row, or vice-versa

If `panel-builder` pushes the btn-row's *parent* (`ui` container body) into
`bodyElements`, hiding the parent collapses the row container; on expand the
parent's `display:''` works, but if the btn-row itself was separately pushed,
the second `display=''` overwrites the original `flex` → same end state as Hypothesis A.

Need to confirm in Step 2 by reading the `bodyElements.push(...)` sites in `panel-builder.ts` / `panel-sections.ts`.

---

## 5. What Step 2 must verify

- [ ] grep all `bodyElements.push(` to confirm whether `btnRow` (or its wrapper) is in the list.
- [ ] reproduce in browser, run `getComputedStyle(btnRow).display` before/after a minimize→expand cycle.
- [ ] confirm whether `el.style.display = ''` resets an inline `display:flex` written via `cssText` (it does — `cssText` writes to the inline style declaration; `style.display=''` clears that property).
- [ ] check whether the same bug affects the title row's flex layout (it should NOT, because the title row is never hidden).

---

## 6. Provisional conclusion

The lifecycle map points squarely at **Hypothesis A**: `toggleMinimize` uses
`el.style.display = 'none' / ''` to hide and restore body elements, but the button
row was built with `display:flex` written *inline* via `cssText`. Clearing the
inline `display` property reverts the row to `<div>`'s default `block`, killing
the flex layout (gap, wrap, justify-content) and producing the "squished" look.

Step 2 will confirm by inspecting the live DOM and the `bodyElements.push` call sites,
then Step 3 will pick the smallest durable fix — most likely **stash & restore the
original `display` value** (mirror `expandedHeight`'s pattern) rather than blanket
`display = ''`.
