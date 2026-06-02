# 05 — Cancel

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T65

## Surfaces

- **Esc** while the queue widget is focused.
- Dedicated **Stop** button in the queue UI.
- Programmatic: `QueueEngine.cancelAll(reason?)`.

## Behavior

1. Mark the currently-processing task `failed { reason: "CancelledByUser" }` if it was mid-flight.
2. Drop all `pending` and `hold` tasks (status → `failed { reason: "CancelledByUser" }`).
3. Abort the in-flight delay timer (see `100-queue-model/...` and Step 12 delay engine).
4. Do **not** undo already-submitted prompts; the host owns those.
5. Emit `QueueEvent { kind: "cancelled", count }`.

## Esc scope rules

- Esc only cancels when the queue widget owns focus OR no editable element is focused.
- Inside an editable field (input/textarea/contenteditable), Esc MUST defer to the host (e.g. close autocomplete).

## Idempotency

`cancelAll` is safe to call repeatedly; subsequent calls are no-ops once the queue is empty.
