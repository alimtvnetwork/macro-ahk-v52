# T47 · Paste strategies

**Created:** 2026-06-02

Once T46 returns a target element, the injector must place text into
it in a way the HostApp's framework **observes**. Different editor
kinds need different strategies.

## Strategy table

| `EditorKind` | Primary strategy | Fallback (in order) |
|---|---|---|
| `textarea` | Set `value` + dispatch `InputEvent("input", { inputType: "insertText", data: text, bubbles: true })`. | `execCommand("insertText", false, text)` after focusing. |
| `input` (single-line) | Same as `textarea`. | — |
| `contenteditable` | `execCommand("insertText", false, text)` after `focus()` + `Selection.collapseToEnd()`. | Synthesised `InputEvent` with `inputType: "insertFromPaste"` + `DataTransfer`. |
| `prosemirror` | Dispatch `paste` event with a populated `ClipboardEvent.clipboardData`; ProseMirror's `editable` view ingests it. | `execCommand("insertText")` (less reliable). |
| `lexical` | Same as ProseMirror (`paste` event with `text/plain` payload). | Adapter-specific imperative API if exposed by host (`window.__lexicalEditors`). |
| `monaco` | `editor.trigger("source", "type", { text })` on the Monaco instance the host exposes. | None (Monaco does not respect synthesised events). |
| `other` | `execCommand("insertText")` after `focus()`. | Last-ditch `target.textContent += text` + manual `InputEvent`. |

## Why this matters

React/Vue/Svelte controlled inputs ignore plain `element.value = …`.
The dispatched `InputEvent` (with `bubbles: true`) is what triggers
their state update. Skipping the event ⇒ text appears, then disappears
on the next render.

## Common pre-paste steps

Every strategy MUST:

1. Bring the target into the viewport (`scrollIntoView({ block: "nearest" })`).
2. Call `target.focus({ preventScroll: true })`.
3. Position the caret per T48 (append / replace / at-cursor).

## Common post-paste steps

Every strategy MUST:

1. Call T49 verification — read back, confirm the text landed.
2. Emit a paste toast per T50 (unless suppressed by caller).
3. Return focus to the ChatBox (it should already have focus — assert).

## No clipboard pollution

The injector MUST NOT touch the OS clipboard (`navigator.clipboard.*`).
Some hosts disable clipboard APIs; more importantly, hijacking the
user's clipboard is surprising. ProseMirror/Lexical's `paste` event
path uses a **synthesised** `DataTransfer`, not the real clipboard.

## Determinism

Given the same `(target, text, mode)`, the strategy MUST be a pure
function of inputs. No reads from `Date.now()` or random; no implicit
retries.

## Acceptance

- [ ] The implementation satisfies the `T47 · Paste strategies` contract in this file and the folder-level acceptance target: all supported paste strategies inject and verify prompt text without corrupting selection state.
- [ ] Verification passes when `UT-inject-001..008 and E2E-inject-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** resolve the target editor by walking `document.activeElement` → contenteditable ancestor → adapter from `07-editor-adapters/`; reject if none match within `TARGET_RESOLVE_TIMEOUT_MS` (250).
- **MUST** use the paste strategy returned by the adapter (`execCommand`, `InputEvent`, or `clipboardData`) — never branch on `userAgent`.
- **MUST** verify the paste landed by re-reading the editor content within `PASTE_VERIFY_TIMEOUT_MS` (150); mismatch throws `Reason="PasteMismatch"` with the full diff.
- **MUST** show the paste toast (`05-paste-toast.md`) for both success and failure; no silent paste.

## Pitfalls / Counter-examples

- ❌ Calling `execCommand("insertText")` in a host that strips it. ✅ Adapter probes capability once on mount; result cached per editor instance.
- ❌ Moving the caret to end-of-document after paste. ✅ Restore caret to the original selection range + insertion length.
- ❌ Treating an empty editor as "paste succeeded". ✅ Verify by reading text length pre/post.
- ❌ Swallowing `Reason="PasteMismatch"` to keep the UI quiet. ✅ Surface via toast + Logger.error.
- ❌ Retrying paste with a different strategy on failure. ✅ Fail fast; ask user to retry manually (no-retry policy).

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.

---

> Owner: see [Script injection lifecycle](mem://architecture/script-injection-lifecycle) for the authoritative rule backing the MUST/SHALL statements in this file.
