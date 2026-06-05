# T48 · Cursor and selection — paste modes

**Created:** 2026-06-02

How existing ChatBox content interacts with the pasted prompt text.
The user (or queue engine) picks one of three `PasteMode` values per
injection.

## `PasteMode`

```ts
export type PasteMode = "append" | "replace" | "at-cursor";
```

| Mode | Before | After |
|---|---|---|
| `append` | `"Hello "` (caret at end) | `"Hello Next, list remaining tasks…"` |
| `replace` | any content | `"Next, list remaining tasks…"` (whole field overwritten) |
| `at-cursor` | `"Hello \|world"` (caret between) | `"Hello Next, …world"` |

## Defaults

- Manual single-prompt injection (clicking a row): **`append`** if the
  ChatBox is non-empty, **`replace`** if empty. UI MAY override per row.
- NextLoop / PlanLoop queued tasks: **`replace`** (each task is the
  whole next turn). This is non-negotiable; mixing modes inside a
  loop yields surprising chatbot turns.

## Algorithm per mode

### `append`

1. Move caret to end:
   - textarea/input → `target.selectionStart = target.selectionEnd = target.value.length`.
   - contenteditable → `Selection.selectAllChildren(target); Selection.collapseToEnd()`.
2. Run T47 strategy.

### `replace`

1. Select all existing content:
   - textarea/input → `target.select()`.
   - contenteditable → `Selection.selectAllChildren(target)`.
2. Run T47 strategy. The synthesised `InputEvent` with
   `inputType: "insertText"` replaces the selection in one step,
   which React/Vue treat as a single state update.

### `at-cursor`

1. **Do not move the caret.** Trust the user's existing selection.
2. If the selection is empty, insert at caret.
3. If non-empty, the strategy's `insertText` replaces that selection
   (native behaviour).

## Newline handling

Prompt bodies often start/end with `\n`. The injector inserts them
verbatim:

- `textarea`: `\n` is preserved.
- `contenteditable`: `\n` is translated by the framework (`InputEvent`
  with `data: "\n"` typically becomes a `<br>` or `<p>` split). No
  pre-translation by the injector — the host's editor owns it.

## IME safety

If `target.compositionupdate` is in flight (IME composing), the
injector MUST wait for `compositionend` (max 2 s) before pasting.
Pasting mid-composition corrupts the user's input.

## Verification cross-ref

After the paste, T49 confirms the text actually landed in the value /
text content. A mismatch in `replace` mode often means the framework
re-rendered between steps; the verification retries once (no
backoff).

## Acceptance

- [ ] The implementation satisfies the `T48 · Cursor and selection — paste modes` contract in this file and the folder-level acceptance target: all supported paste strategies inject and verify prompt text without corrupting selection state.
- [ ] Verification passes when `UT-inject-001..008 and E2E-inject-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Script injection lifecycle](mem://architecture/script-injection-lifecycle) for the authoritative rule backing the MUST/SHALL statements in this file.
