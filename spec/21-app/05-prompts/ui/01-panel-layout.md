# Prompts Panel — Layout

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

The panel is a single dialog with two tabs: **Prompts** (default) and **Macros**. Width is fixed; height adapts to viewport with internal scrolling.

## Anchoring & sizing

- Mount: `position: fixed`, anchored to the Prompts button's right edge, opening **upward** (above the chatbox).
- Width: `420px`. Max height: `min(640px, calc(100vh - 120px))`. Internal scroll on `.panel-list`.
- Z-index: same band as Marco's existing toast (`mem://features/extension-startup-ux`).
- `role="dialog"`, `aria-modal="false"` (non-blocking — chatbox stays interactive).

## Wireframe

```
┌─────────────────────────────────────────────────────────┐
│ [ Prompts ] [ Macros ]                          [ ✕ ]   │ ← tab strip + close
├─────────────────────────────────────────────────────────┤
│ 🔍  Search prompts…                                     │ ← search input
├─────────────────────────────────────────────────────────┤
│ [ All ]  [ Audit ]  [ Spec ]  [ Memory ]  [ + ]         │ ← category chips
├─────────────────────────────────────────────────────────┤
│ ★ FAVORITES                                              │
│   ▸ start-prompt                          [Insert] [⋯]   │
│   ▸ rejog-the-memory-v1                   [Insert] [⋯]   │
├─────────────────────────────────────────────────────────┤
│ ALL PROMPTS (42)                                         │
│   ▸ unified-ai-prompt-v4                  [Insert] [⋯]   │
│   ▸ issues-tracking                       [Insert] [⋯]   │
│   ▸ unit-test-failing                     [Insert] [⋯]   │
│   …                                                      │
├─────────────────────────────────────────────────────────┤
│ Bundle 00042-3F7K1Z · Seeded 10:15 KL · [Reload]         │ ← footer
└─────────────────────────────────────────────────────────┘
```

When the **Macros** tab is active, the body switches to:

```
├─────────────────────────────────────────────────────────┤
│ 🔍  Search macros…                       [+ New Macro]   │
├─────────────────────────────────────────────────────────┤
│ ▶ spec-tighten-cycle      (built-in)     [Run] [⋯]       │
│ ▶ review-and-fix-loop     (built-in)     [Run] [⋯]       │
│ ▶ weekly-spec-audit       (built-in)     [Run] [⋯]       │
│ ▶ my-custom-macro         (user)         [Run] [⋯]       │
├─────────────────────────────────────────────────────────┤
│ ⏵ Running: spec-tighten-cycle · step 4/9 · loop 2/3      │ ← run banner (sticky bottom)
│   LastScore 78/100             [⏸] [⏹]                  │
└─────────────────────────────────────────────────────────┘
```

## Section anatomy

| Region              | Element / role                                                          | Notes                                                              |
|---------------------|-------------------------------------------------------------------------|--------------------------------------------------------------------|
| Tab strip           | `role="tablist"` with two `role="tab"` children                         | Arrow-key navigation; `aria-controls` to body region.              |
| Close button        | `role="button"`, `aria-label="Close prompts panel"`                     | Esc also closes.                                                   |
| Search input        | `role="searchbox"`, debounced 80ms                                      | Filter logic in `ui/02-filter-and-search.md`.                      |
| Category chips      | `role="radiogroup"`; chips `role="radio"`                               | `[ + ]` opens category editor (`ui/03-categories.md`).             |
| Favorites group     | `role="group" aria-label="Favorites"`                                   | Hidden when empty.                                                 |
| All prompts list    | Virtualized `role="listbox"` (single-select)                            | Each row `role="option"`; `[Insert]` action + `[⋯]` overflow menu. |
| Footer              | Plain `<footer>`                                                        | Shows `BuildHash` + last seed time (KL TZ) + manual reload.        |
| Macros body         | Same listbox pattern, rows show Run/Edit/Duplicate/Export/Delete.       | Spec in `ui/05-macros-tab.md`.                                     |
| Run banner          | `role="status"` (polite), sticky to panel bottom                        | Full spec in `ui/07-run-banner.md`.                                |

## Empty states

- No matching search results → centered text `"No prompts match \"<query>\""` + `[Clear search]` button.
- No prompts seeded at all → `"Prompts haven't loaded yet."` + `[Retry seed]`. Failure surfaces via the standard failure-log shape (`mem://standards/verbose-logging-and-failure-diagnostics`).
- No macros authored and no built-ins seeded → `"No macros yet."` + `[+ New macro]` + `[Import JSON]`.

## Dark-theme tokens (HSL — `mem://preferences/dark-only-theme`)

```css
--panel-bg:           hsl(220 14% 12%);
--panel-border:       hsl(220 14% 22%);
--panel-fg:           hsl(220 10% 90%);
--panel-muted:        hsl(220 8% 60%);
--panel-row-hover:    hsl(220 14% 18%);
--panel-row-selected: hsl(220 14% 22%);
--panel-chip-bg:      hsl(220 14% 18%);
--panel-chip-active:  hsl(38 92% 56%);
--panel-shadow:       0 12px 32px hsl(0 0% 0% / 0.55);
```

All raw color values are forbidden in components (`mem://preferences/dark-only-theme`).

## Tab persistence

Active tab persists in `chrome.storage.local` under `Prompts.ActiveTab` (`"prompts" | "macros"`), identity-only key (`mem://constraints/no-storage-pascalcase-migration`).

## Test coverage

- Snapshot: panel renders with expected ARIA tree on both tabs.
- Interaction: tab switch via arrow keys; close on Esc; outside-click close.
- Virtualization: 500-row fixture scrolls without dropping rows.
