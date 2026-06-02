# Keyboard Map

All shortcuts active **only** when the prompt panel has focus OR an active macro run exists.
Disabled inside editable fields (`input`, `textarea`, `[contenteditable]`).

| Shortcut | Action | Spec |
|---|---|---|
| `Ctrl+Alt+P` | Resume paused macro | runner.resume |
| `Ctrl+Alt+;` | Pause running macro | runner.pause |
| `Ctrl+Alt+.` | Stop running macro (abort) | runner.stop |
| `Ctrl+K` | Focus prompt search box | panel.focusSearch |
| `Esc` | Close variable-input dialog | dialog.cancel |
| `Enter` | Submit variable-input dialog | dialog.submit |
| `↑` / `↓` | Navigate prompt list | panel.list |
| `Tab` | Move between filter chips | panel.filterChips |
| `Shift+?` | Open keyboard cheatsheet | panel.help |

## Implementation note

Single global listener attached on extension boot; teardown on `pagehide` per `mem://standards/timer-and-observer-teardown`. Repeated key bindings are coalesced (no auto-repeat fires `resume` twice within 250 ms).
