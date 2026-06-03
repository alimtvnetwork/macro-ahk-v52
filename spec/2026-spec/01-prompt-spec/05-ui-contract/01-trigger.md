# T41 · Trigger surface

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Where and how the End User opens the Prompts dropdown. The Prompts
feature ships **no opinion** on the host UI chrome — the integrator
picks one or more triggers from the menu below.

## Trigger options (integrator picks ≥ 1)

| Id | Surface | Notes |
|---|---|---|
| `floating-button` | A small floating action button anchored near the ChatBox. | Default for web HostApps. Z-index must clear modals; placement is host-defined. |
| `keyboard-shortcut` | A user-configurable keyboard combo. | Default suggestion: `Ctrl+Shift+P` (macOS: `⌘⇧P`). MUST be opt-in to avoid collisions. |
| `slash-command` | Typing `/p` (or another configured prefix) at the start of the ChatBox opens the dropdown inline. | Adapter must intercept `Input` events; cancel on space/escape. |
| `context-menu` | Right-click on the ChatBox shows a "Prompts…" entry. | Optional; rarely the only trigger. |
| `host-api` | Imperative `prompts.open()` call exposed to the HostApp. | Always present; backs all other triggers. |

## Contract every trigger must satisfy

1. Calls `prompts.open({ anchor })` where `anchor` is a DOM rect or
   `null` (centred).
2. Focus moves to the dropdown's search box on open.
3. Re-opening while open is a no-op (do not stack).
4. Closing returns focus to the previous active element (typically
   the ChatBox).

## Anti-patterns

- **Auto-open on page load** — never. Only user action opens the dropdown.
- **Open while the user is typing into the ChatBox** without an
  explicit gesture (slash-command counts as explicit).
- **Trigger that hides without warning** — every trigger must be
  discoverable from at least one persistent affordance.

## Host question

Q-UI-1 (deferred to integrator): which trigger(s) ship on day one?
Default recommendation: **floating-button + host-api**.
