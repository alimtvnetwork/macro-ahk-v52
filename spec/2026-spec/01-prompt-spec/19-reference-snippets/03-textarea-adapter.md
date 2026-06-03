# 03 — Textarea editor adapter reference

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T113

```ts
import type { EditorAdapter } from "../07-editor-adapters";

export const textareaAdapter: EditorAdapter = {
  kind: "textarea",
  match(el): el is HTMLTextAreaElement {
    return el instanceof HTMLTextAreaElement
      || (el instanceof HTMLInputElement && el.type === "text");
  },
  async paste(el, text, mode = "replace") {
    const target = el as HTMLTextAreaElement;
    const start = mode === "at-cursor" ? target.selectionStart ?? target.value.length : 0;
    const end   = mode === "at-cursor" ? target.selectionEnd ?? start : target.value.length;
    const before = mode === "append" ? target.value : target.value.slice(0, start);
    const after  = mode === "append" ? "" : target.value.slice(end);

    const next = mode === "append" ? before + text : before + text + after;
    const proto = Object.getPrototypeOf(target);
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    setter?.call(target, next);              // bypass React’s wrapper
    target.dispatchEvent(new Event("input",  { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));

    return target.value.includes(text);      // paste-verification read-back
  },
};
```

**Notes**
- Uses the native value setter so React/Vue controlled inputs accept the change.
- `paste` returns a boolean for the caller's read-back assertion (T49).
- No `execCommand` — deprecated in modern browsers for textareas.
