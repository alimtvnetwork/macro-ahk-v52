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

## Acceptance

- [ ] The implementation satisfies the `03 — Textarea / Input Adapter` contract in this file and the folder-level acceptance target: textarea, contenteditable, and rich-editor adapters expose the same injection contract.
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
