# Prompts Button — Trigger & Anchor

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

The Prompts button is the single entry point that opens the Prompts panel (search + categories + favorites + Macros tab). This doc fixes the trigger element, anchor, states, and a11y so every implementation matches.

## Placement

- Anchor: floating action element rendered by the `MacroController` UI manager, fixed inside the host page's chatbox toolbar (right edge, vertically centered against the editor row).
- One singleton per tab. Re-injection check via the existing `ID_` constants pattern (`mem://architecture/constant-naming-convention`):
  - `ID_PROMPTS_BUTTON = "marco-prompts-button"`
  - `ATTR_PROMPTS_OPEN = "data-prompts-open"`
- Refuses to mount on new-tab / blank URLs per `mem://features/new-tab-no-url-guard` (`isNewTabOrBlankUrl()` gate).

## Trigger behaviour

| Action                           | Result                                                                 |
|----------------------------------|------------------------------------------------------------------------|
| `click`                          | Toggle panel open/closed.                                              |
| `Enter` / `Space` while focused  | Same as click.                                                         |
| `Escape` while panel open        | Close panel, return focus to button.                                   |
| `ArrowDown` while focused        | Open panel and move focus to the search input.                         |
| Re-click while open              | Close panel.                                                           |

Outside-click closes the panel and returns focus to the button. Page navigations close the panel via the existing teardown contract (`mem://standards/timer-and-observer-teardown`).

## States (data-attribute driven)

`data-state` on the button: `idle | hover | focus-visible | open | macro-running | disabled`.

| State            | Trigger                                                       | Visual hint                                  |
|------------------|---------------------------------------------------------------|----------------------------------------------|
| `idle`           | Default.                                                      | Base token.                                  |
| `hover`          | Pointer over.                                                 | Slight surface elevation.                    |
| `focus-visible`  | Keyboard focus.                                               | Focus ring (HSL token).                      |
| `open`           | Panel is mounted.                                             | Accent border + chevron rotated 180°.        |
| `macro-running`  | Engine has an active run (any state ≠ `idle` or `done`).      | Animated dot indicator; tooltip shows runId. |
| `disabled`       | Boot failure / token gate not ready / new-tab guard tripped.  | Reduced opacity, `aria-disabled="true"`.     |

State transitions never poll — they react to the existing message bus events:
- `MACRO_RUN_STATE_CHANGED` (Block 7) flips `macro-running` on/off.
- `ERROR_COUNT_CHANGED` (`mem://architecture/real-time-error-synchronization`) does NOT affect this button (it has its own error pill).

## Accessibility (ARIA combobox pattern)

- `role="combobox"` on the button.
- `aria-haspopup="dialog"` (panel is a dialog, not a listbox — it contains tabs and a builder).
- `aria-expanded="true|false"` mirrors `data-state` open vs not.
- `aria-controls="marco-prompts-panel"`.
- Tooltip via `aria-describedby` pointing at a visually-hidden span; no native `title=` attribute (consistent with `mem://features/macro-controller/workspace-tooltip-members-popup` — singleton hover card pattern).

## Dark-theme tokens (HSL)

All values are tokens, never raw colors (`mem://preferences/dark-only-theme`). Add to `index.css`:

```css
:root {
  --prompts-btn-bg:        hsl(220 14% 16%);
  --prompts-btn-bg-hover:  hsl(220 14% 20%);
  --prompts-btn-border:    hsl(220 14% 28%);
  --prompts-btn-fg:        hsl(220 10% 88%);
  --prompts-btn-accent:    hsl(38 92% 56%);     /* matches diagrams Amber */
  --prompts-btn-running:   hsl(160 84% 45%);    /* matches diagrams Emerald */
  --prompts-btn-ring:      hsl(38 92% 56% / 0.55);
  --prompts-btn-shadow:    0 2px 8px hsl(0 0% 0% / 0.40);
}
```

No light-mode fork; theme is dark-only (`mem://preferences/dark-only-theme`).

## Loading + failure surfaces

- While the prompts bundle is being seeded for the first time, the button shows `disabled` with tooltip `"Loading prompts…"` and an inline spinner.
- If seed fails, `BootFailureBanner` (`mem://architecture/extension-error-management`) shows the standard failure-log shape; the button stays `disabled` with `aria-describedby` pointing at the banner.

## Test coverage (`mem://preferences/test-with-features`)

- Component test: state transitions across `idle → hover → focus-visible → open → macro-running`.
- Keyboard test: `Enter` / `Space` / `Escape` / `ArrowDown` paths.
- a11y test: `axe-core` smoke; asserts `role`, `aria-expanded`, `aria-haspopup`, `aria-controls`.
