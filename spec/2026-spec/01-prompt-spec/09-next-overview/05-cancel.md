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

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [`next` command convention](mem://preferences/next-command-convention) for the authoritative rule backing the MUST/SHALL statements in this file.
