# Empty States

| Surface | Trigger | Copy | CTA |
|---|---|---|---|
| Macros tab | zero saved macros | "No macros yet. Build your first one." | "Create macro" → opens builder |
| Run history | zero past runs | "No runs yet. Start a macro to see history here." | none |
| Prompt list | zero prompts after filter | "No prompts match these filters." | "Clear filters" |
| Audit findings | zero findings | "Clean — no findings at this score." | none |
| Variables panel | macro has no variables | "This macro takes no inputs." | none |
| Event stream | no events yet | "Waiting for events…" (with spinner) | none |
| Search box | no query | placeholder "Search prompts (Ctrl+K)" | none |

## Visual treatment

- Centered vertically in container, max-width 360 px.
- Single icon (24 px) using `--accent` at 60% opacity.
- Headline in `--font-display` 16 px, body in `--font-body` 14 px @ `--foreground` 70% opacity.
- CTA button uses `--primary` variant.
