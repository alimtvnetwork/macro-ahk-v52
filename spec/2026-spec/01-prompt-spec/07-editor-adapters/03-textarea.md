# 03 — Textarea / Input Adapter

**Date:** 2026-06-02
**Task:** T53

## Scope

`<textarea>` and `<input type="text|search|url|email">`.

## canHandle

```ts
canHandle(el) {
  return el instanceof HTMLTextAreaElement
    || (el instanceof HTMLInputElement && TEXTUAL_INPUT_TYPES.has(el.type));
}
const TEXTUAL_INPUT_TYPES = new Set(["text","search","url","email","tel"]);
```

## insertText

1. Try `document.execCommand("insertText", false, text)` while focused.
2. Fallback: native setter to preserve React/Vue controlled-component behavior.
   ```ts
   const proto = el instanceof HTMLTextAreaElement
     ? HTMLTextAreaElement.prototype
     : HTMLInputElement.prototype;
   const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
   const next = el.value.slice(0, selStart) + text + el.value.slice(selEnd);
   setter.call(el, next);
   el.dispatchEvent(new Event("input", { bubbles: true }));
   ```
3. Update `selectionStart = selectionEnd = selStart + text.length`.

## readValue

Return `el.value`.

## getCaret

Return `{ start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 }`.
