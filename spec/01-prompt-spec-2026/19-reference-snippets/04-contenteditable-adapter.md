# 04 — contenteditable adapter reference

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T114

```ts
import type { EditorAdapter } from "../70-editor-adapters";

export const contentEditableAdapter: EditorAdapter = {
  kind: "contenteditable",
  match(el): el is HTMLElement {
    return el instanceof HTMLElement && el.isContentEditable;
  },
  async paste(el, text, mode = "replace") {
    const target = el as HTMLElement;
    target.focus();

    if (mode === "replace") {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else if (mode === "append") {
      const range = document.createRange();
      range.selectNodeContents(target);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // 'at-cursor' uses the existing selection as-is.

    // Preferred path: InputEvent with insertFromPaste.
    const ev = new InputEvent("beforeinput", {
      inputType: "insertFromPaste",
      data: text,
      bubbles: true,
      cancelable: true,
    });
    const accepted = target.dispatchEvent(ev);

    if (!accepted || !target.textContent?.includes(text)) {
      // Fallback: legacy execCommand (still works in Chromium).
      document.execCommand("insertText", false, text);
    }

    target.dispatchEvent(new Event("input", { bubbles: true }));
    return (target.textContent ?? "").includes(text);
  },
};
```

**Notes**
- Tries the modern `beforeinput`/`InputEvent` path first; falls back to `execCommand` only when the editor cancels or ignores the event.
- No retry loop — host engine handles fail-fast on `false` return.
