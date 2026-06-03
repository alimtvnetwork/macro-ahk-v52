# T49 · Paste verification

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

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
