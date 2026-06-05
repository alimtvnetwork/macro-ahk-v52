# 05 — Adapter Fallback & Detection

**Date:** 2026-06-02
**Task:** T55

## Resolution algorithm

```
function resolveAdapter(target):
  for adapter in registry.reverseOrder():
    if adapter.canHandle(target): return adapter
  return NullAdapter   // logs warn, returns ok:false reason:"RejectedByEditor"
```

## Detection helpers (shared)

- `findEditableAncestor(el, maxDepth=5)` — walk up to find `isContentEditable` ancestor.
- `isInIframe(el)` — true if `el.ownerDocument !== top.document`; iframe targets require the adapter to operate inside that document.
- `isVisible(el)` — bounding rect has area and computed visibility is not `hidden`.

## Failure ladder for the injection layer

| Step | Action | On failure |
|------|--------|------------|
| 1 | `resolveAdapter(target).insertText(...)` | go to 2 |
| 2 | Try `TextareaAdapter` / `ContentEditableAdapter` by structural sniff | go to 3 |
| 3 | Clipboard fallback (if host policy allows) — see injection contract | toast `PasteFailed` |

## Logging

Each attempt MUST log `{ adapterId, target: cssPath(target), ok, reason }`. Aggregated into the failure-log schema (see Core memory: verbose logging & failure diagnostics).

## ??? snippet handling

If `prompt.body` contains `???`, after successful insert the adapter MUST place the caret at the first `???` occurrence (or the start of the inserted text if none found). Uses `getCaret` + adapter-specific selection API.

## Acceptance

- [ ] The implementation satisfies the `05 — Adapter Fallback & Detection` contract in this file and the folder-level acceptance target: textarea, contenteditable, and rich-editor adapters expose the same injection contract.
- [ ] Verification passes when `E2E-adapter-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.

## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
