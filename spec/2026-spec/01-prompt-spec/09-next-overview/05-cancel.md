# 05 — Cancel

**Date:** 2026-06-02
**Task:** T65

## Surfaces

- **Esc** while the queue widget is focused.
- Dedicated **Stop** button in the queue UI.
- Programmatic: `QueueEngine.cancelAll(reason?)`.

## Behavior

1. Mark the currently-processing task `failed { reason: "CancelledByUser" }` if it was mid-flight.
2. Drop all `pending` and `hold` tasks (status → `failed { reason: "CancelledByUser" }`).
3. Abort the in-flight delay timer (see `10-queue-model/...` and Step 12 delay engine).
4. Do **not** undo already-submitted prompts; the host owns those.
5. Emit `QueueEvent { kind: "cancelled", count }`.

## Esc scope rules

- Esc only cancels when the queue widget owns focus OR no editable element is focused.
- Inside an editable field (input/textarea/contenteditable), Esc MUST defer to the host (e.g. close autocomplete).

## Idempotency

`cancelAll` is safe to call repeatedly; subsequent calls are no-ops once the queue is empty.

## Acceptance

- [ ] The implementation satisfies the `05 — Cancel` contract in this file and the folder-level acceptance target: NextLoop submission, disabled-button handling, interruption, and cancellation behavior is deterministic.
- [ ] Verification passes when `E2E-next-001..005` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
