# H10 — Host-wiring PoC (2026-prompts-generic)

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** H10 (spec-hardening backlog)

A single self-contained `index.html` wires together the five reference
snippets from `spec/2026-prompts-generic/190-reference-snippets/`:

1. `01-prompt-store-in-memory` → `createInMemoryPromptStore`
2. `02-queue-engine`           → `createQueueEngine`
3. `03-textarea-adapter`       → `textareaAdapter`
4. (no contenteditable in this PoC — textarea-only host)
5. `05-next-loop-orchestrator` → `createNextLoop`

Plus a minimal in-memory `QueueStore` (the spec leaves persistence to the
host; the PoC keeps it in a `Map`).

## Run

```
# any static server works
npx serve poc/2026-prompts-generic
# or
python3 -m http.server -d poc/2026-prompts-generic 8080
```

Open `http://localhost:8080` and:

1. Edit the prompt body (`${i}` is replaced with the iteration index).
2. Set repeat count, click **Enqueue**.
3. Click **Start** — watch tasks paste into the chat box and "submit".
4. Toggle `isAuthenticated` off mid-run → next task fails fast with
   `Reason=LoggedOut` (matches the No-Retry policy).

## Notes

- Delay shortened to 1–2 s (the spec mandates 5–10 s in production; Q6).
- Bulk cap at 999 (Q7).
- `detectInterruption` is a never-resolving promise — extend it for a real
  host (e.g. detect captcha overlay).
- Persistence (`localStorage` / IndexedDB / SQLite) is intentionally left
  out; swap `createInMemoryPromptStore` / `createInMemoryQueueStore` for the
  host-specific implementation.
