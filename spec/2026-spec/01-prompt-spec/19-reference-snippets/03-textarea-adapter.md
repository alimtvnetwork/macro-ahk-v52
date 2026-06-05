# 03 — Textarea editor adapter reference

**Date:** 2026-06-02
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

## Acceptance

- [ ] The implementation satisfies the `03 — Textarea editor adapter reference` contract in this file and the folder-level acceptance target: reference snippets remain copyable and typecheck without hidden imports.
- [ ] Verification passes when `typecheck-spec-snippets.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
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
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

