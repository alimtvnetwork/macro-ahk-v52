# 03 — Integration Tests

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T108

## Editor adapter matrix

Run a single `insertText("hello {{name}}")` assertion against each combination:

| Adapter | Target fixture |
|---------|----------------|
| ContentEditable | `<div contenteditable="true">` |
| ContentEditable | nested `<div contenteditable="true"><p></p></div>` |
| Textarea | `<textarea>` (empty, with existing value, with selection) |
| Input | `<input type="text">`, `type="search"`, `type="url"`, `type="email"`, `type="tel"` |
| ProseMirror | mocked editor view with `dispatch` spy |
| Lexical | mocked editor with `update` spy |
| CodeMirror | mocked view with `dispatch` spy |
| Monaco | mocked editor with `executeEdits` spy |

Each combo asserts:
- Returned `InsertResult.ok === true`.
- `insertedLength === text.length`.
- Selection collapsed to end of insertion.
- An `input` event fired (or editor-specific equivalent).

## Loader × Store

- Add 100 prompts, render concurrently, verify a single render per slug.
- Archive then re-render → loader treats archived as still loadable for queued tasks.
- Override a default → reset removes override.

## Queue × Adapter × Observer

- Mock idle observer to emit `Idle` after 50ms; queue of 5 tasks drains, all `completed`.
- Observer emits `Interrupted` → task goes `hold`, queue pauses, `resumeAll` transitions back to `processing` without re-inject.
- Observer emits `Timeout` → task `failed { IdleTimeout }`, queue continues with next task.
