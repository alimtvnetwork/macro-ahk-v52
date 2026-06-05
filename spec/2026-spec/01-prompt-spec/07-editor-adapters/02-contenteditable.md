# 02 — ContentEditable Adapter

**Date:** 2026-06-02
**Task:** T52

## Scope

Default adapter for ChatBox targets that are `<div contenteditable="true">` or any element with `isContentEditable === true`.

## canHandle

```ts
canHandle(el) {
  return el instanceof HTMLElement && el.isContentEditable;
}
```

## insertText — strategy ladder

1. **`document.execCommand("insertText", false, text)`** — preferred; preserves undo and fires `input` events that the host editor listens for.
2. If `execCommand` returns `false` (Firefox stricter mode, deprecated host), fall back to **InputEvent + Selection API**:
   - `selection.deleteFromDocument()`
   - `range.insertNode(document.createTextNode(text))`
   - Collapse range to end, dispatch `new InputEvent("input", { inputType: "insertText", data: text, bubbles: true })`.
3. If both fail, return `{ ok:false, reason:"RejectedByEditor" }`.

## Caret restoration

After insertion: collapse selection to end of inserted text, scrollIntoView if off-viewport.

## Notes

- Never use `el.innerText = ...` or `el.textContent = ...` — destroys undo stack and breaks rich-editor wrappers.
- Never use `clipboard.writeText` + synthetic paste — out of scope here; see `06-injection-contract/02-paste-strategies.md`.

## Acceptance

- [ ] The implementation satisfies the `02 — ContentEditable Adapter` contract in this file and the folder-level acceptance target: textarea, contenteditable, and rich-editor adapters expose the same injection contract.
- [ ] Verification passes when `E2E-adapter-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

> Owner: see [Platform adapter pattern](mem://architecture/platform-adapter-pattern) for the authoritative rule backing the MUST/SHALL statements in this file.
