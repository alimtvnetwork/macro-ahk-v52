# T49 · Paste verification

**Created:** 2026-06-02

After running the T47 strategy, the injector MUST confirm the text
actually reached the ChatBox. This is the single most common source
of silent failures in framework-controlled editors.

## Verification algorithm

```
expected := text that was pasted
target   := ChatBox element from T46
mode     := PasteMode from T48
deadline := now + 250 ms      // hard cap; no exponential backoff

repeat until now > deadline:
    observed := readBack(target)        // see "Read-back" below
    if matches(observed, expected, mode):
        return Ok
    yield to next animation frame
return Failed
```

A single repeat-until-frame loop is allowed inside the 250 ms window
because some frameworks re-render asynchronously. There is **no**
recursive retry of the paste itself (one retry is described below,
once, and is bounded).

## Read-back per editor kind

| EditorKind | Read-back |
|---|---|
| `textarea` / `input` | `target.value` |
| `contenteditable` | `target.innerText` (NOT `textContent` — preserves newlines as the user sees them) |
| `prosemirror` | `target.innerText` for the verification surface; deeper checks (doc JSON) are adapter-specific. |
| `lexical` | Same as ProseMirror. |
| `monaco` | `editor.getValue()` from the exposed instance. |
| `other` | `target.value ?? target.innerText` |

## `matches(observed, expected, mode)`

- `append` → `observed.endsWith(expected)`
- `replace` → `observed === expected` (whitespace-significant)
- `at-cursor` → `observed.includes(expected)`

Whitespace is **not** trimmed before comparison; prompts that rely on
trailing newlines must verify their newlines arrived.

## Single retry

On the first verification failure within the deadline, the injector
MAY retry the paste **once** with a fresh `focus()` and the same
`text/mode`. This is a readiness retry, not a backoff loop — per
`mem://constraints/no-retry-policy`. If the second attempt also fails,
escalate to T81 (failure category `paste-rejected`).

## Failure logging

A verification failure MUST emit a `Reason = "PasteVerificationFailed"`
log with `ReasonDetail` describing the discrepancy in one line, plus
a `SelectorAttempts[]` entry for the ChatBox locator. In verbose mode
(`Project.VerboseLogging = true`) the full `observed` and `expected`
strings are saved; otherwise both are truncated to 240 chars with a
`(+N more)` suffix per the project verbose-logging gate.

## What is NOT verified here

- Whether the chatbot eventually responds (out of scope).
- Whether the submit button was enabled (T81 covers it).
- Variable resolution correctness (T38 already validated it).

## Acceptance

- [ ] The implementation satisfies the `T49 · Paste verification` contract in this file and the folder-level acceptance target: all supported paste strategies inject and verify prompt text without corrupting selection state.
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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
