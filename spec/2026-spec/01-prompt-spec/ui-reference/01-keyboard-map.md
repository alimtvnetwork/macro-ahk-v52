# Keyboard Map

**Updated:** 2026-06-03

| Context | Key | Action |
|---|---|---|
| Editor (idle) | `/` at line start | Open Prompt dropdown |
| Dropdown open | `↑` / `↓` | Move selection |
| Dropdown open | `Enter` | Insert selected Prompt (default strategy) |
| Dropdown open | `Tab` | Insert and place cursor at first `${Var}` |
| Dropdown open | `Esc` | Close dropdown, restore caret |
| Dropdown open | Type chars | Live-filter Prompts (substring, case-insensitive) |
| Queue panel | `Space` | Pause / Resume |
| Queue panel | `Ctrl+.` (or `Cmd+.`) | Cancel current task |
| Any | `Ctrl+Alt+P` | Resume |
| Any | `Ctrl+Alt+;` | Pause |
| Any | `Ctrl+Alt+.` | Stop |

All shortcuts are ignored while focus is in a password field or `[contenteditable=false]`.

## Acceptance

- [ ] The implementation satisfies the `Keyboard Map` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
