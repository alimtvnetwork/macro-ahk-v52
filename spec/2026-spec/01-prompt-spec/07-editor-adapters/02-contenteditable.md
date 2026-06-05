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
