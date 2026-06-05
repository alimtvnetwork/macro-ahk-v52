# 04 — contenteditable adapter reference

**Date:** 2026-06-02
**Task:** T114

```ts
import type { EditorAdapter } from "../07-editor-adapters";

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

## Acceptance

- [ ] The implementation satisfies the `04 — contenteditable adapter reference` contract in this file and the folder-level acceptance target: reference snippets remain copyable and typecheck without hidden imports.
- [ ] Verification passes when `typecheck-spec-snippets.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

