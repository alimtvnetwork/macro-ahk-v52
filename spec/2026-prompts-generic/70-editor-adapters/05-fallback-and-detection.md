# 05 — Adapter Fallback & Detection

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
