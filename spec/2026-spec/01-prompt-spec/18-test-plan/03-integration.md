# 03 — Integration Tests

**Date:** 2026-06-02
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

## Acceptance

- [ ] The implementation satisfies the `03 — Integration Tests` contract in this file and the folder-level acceptance target: test inventories, target lists, fixtures, and mocks remain discoverable by automation.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

