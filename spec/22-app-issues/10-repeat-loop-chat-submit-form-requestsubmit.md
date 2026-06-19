# Repeat-loop Auto-submit MUST Use `form#chat-input.requestSubmit()`

**Version landed:** v3.59.0
**Owner file:** `standalone-scripts/macro-controller/src/ui/repeat-loop-ui.ts`
**Related memory:** `mem://features/macro-controller/repeat-loop-chat-submit`

## Problem
Prior to v3.59.0 the repeat-loop fired `sendButton.click()` to submit the chat
composer. After Lovable re-rendered the composer, the cached button reference
became stale and the click was a silent no-op — the repeat loop appeared to
"tick" but no message was sent.

## Decision
Auto-submit MUST go through the form, not the button:

```text
form = document.getElementById('chat-input')   // <form id="chat-input">
form.requestSubmit()                            // preferred
   ├─ unavailable → form.dispatchEvent(new Event('submit', { bubbles, cancelable }))
   └─ no form     → sendButton.click()           // last resort only
```

The selected strategy MUST be reflected in the log message
(`submitted (form#chat-input)` | `submitted (submit-event)` | `submitted (button-fallback)`).

## Rationale
- `requestSubmit()` runs React's `onSubmit` handler the same way `Enter` does,
  so it survives composer re-mounts.
- Centralising the waterfall in `dispatchChatSubmit()` prevents every new
  auto-submitter (slash-commands, plan-task, hot-reload) from re-introducing
  the `.click()` regression.

## Acceptance
- `dispatchChatSubmit()` exists and is the ONLY code path that submits the chat.
- Logs show `form#chat-input` strategy under normal operation.
- A grep for `sendButton.click()` / `querySelector('button[type="submit"]').click()`
  inside the macro-controller returns ZERO matches outside `dispatchChatSubmit()`.
