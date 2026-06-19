---
name: Repeat Loop Chat Submit Contract
description: Repeat-loop and any auto-submit MUST submit form#chat-input via requestSubmit(); never click the send button when the form is reachable
type: feature
---
# Repeat Loop Chat Submit (v3.59.0)

## Rule
Auto-submitting a Lovable chat message MUST prefer `HTMLFormElement.requestSubmit()`
on `form#chat-input`. Clicking the send button is the **last-resort** fallback only
when no form element is found, because the button is rebuilt on every Lovable
re-render and stale references cause silent no-ops.

## Required waterfall (in `dispatchChatSubmit()` in `repeat-loop-ui.ts`)
1. `document.getElementById('chat-input')` → `form.requestSubmit()` (preferred)
2. If `requestSubmit` unavailable → dispatch synthetic `submit` event with `bubbles: true, cancelable: true`
3. Only if no `form#chat-input` exists → fall back to `btn.click()`

## Log shape
`submitted (form#chat-input)` | `submitted (submit-event)` | `submitted (button-fallback)`
The strategy used MUST appear in the log so regressions are visible.

## Why
- `button.click()` failed silently after Lovable re-rendered the composer.
- `form.requestSubmit()` triggers full form validation + React's onSubmit handler the
  same way pressing Enter does, surviving DOM replacement.

## Regression test
Any future "auto submit" feature (slash-commands, plan-task, hot-reload trigger)
MUST reuse `dispatchChatSubmit()` — do NOT re-implement `.click()` paths.
