# A11y Matrix

| Component | Role | Label source | Keyboard | Live region |
|---|---|---|---|---|
| Run banner | `status` | `aria-label="Macro {Slug} {Status}"` | Esc=stop | polite |
| Score chip | `text` | aria-label includes numeric value | — | — |
| Variable-input dialog | `dialog` (modal) | `aria-labelledby={titleId}` | Tab cycle, Esc close, Enter submit | — |
| Filter chips | `tablist` / `tab` | each chip = tab; aria-selected | ←/→ navigate, Enter activate | — |
| Prompt list item | `option` inside `listbox` | aria-label = prompt title | ↑↓ navigate, Enter open | — |
| Error toast | `alert` | role=alert (auto-announce) | dismissible via Esc | assertive |
| Progress step row | `listitem` | aria-current="step" while active | — | — |
| Macros tab | `tab` panel | aria-controls={panelId} | Tab + arrow keys | — |

## Color-contrast

All semantic foreground/background pairs MUST satisfy WCAG AA (4.5:1 for text, 3:1 for large text). Tokens enumerated in `13-css-tokens.md`.

## Focus visibility

Every interactive element MUST show a 2 px outline using `--ring` token. `outline: none` is FORBIDDEN.

## Screen-reader announcements

| Event | Announcement |
|---|---|
| `RunStarted` | "Macro {Slug} started." (polite) |
| `ScoreParsed` | "Score {N} of 100." (polite) |
| `RunCompleted` | "Macro completed with score {N}." (polite) |
| `RunAborted` | "Macro aborted. Reason: {Reason}." (assertive) |
