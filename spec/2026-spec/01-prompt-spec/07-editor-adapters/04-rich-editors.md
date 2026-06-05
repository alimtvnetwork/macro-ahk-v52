# 04 — Rich Editor Adapters (ProseMirror / Lexical / CodeMirror / Monaco)

**Date:** 2026-06-02
**Task:** T54

## Principle

Rich editors own their own document model. Direct DOM mutation breaks them. Adapters MUST use the editor's public API.

## ProseMirror

```ts
const view = (target as any).pmViewRef ?? findProseMirrorView(target);
const { state, dispatch } = view;
dispatch(state.tr.insertText(text, state.selection.from, state.selection.to));
view.focus();
```

`canHandle` returns true when the closest ancestor has class `ProseMirror` and a `pmViewRef` is discoverable.

## Lexical

Use `editor.update(() => { $insertNodes([$createTextNode(text)]); })`. Adapter requires the host to attach the `LexicalEditor` instance to the root node via a known data attribute (e.g. `data-lexical-editor-id`) and a `HOST:` registry lookup.

## CodeMirror 6

```ts
view.dispatch(view.state.replaceSelection(text));
```

## Monaco

```ts
const sel = editor.getSelection()!;
editor.executeEdits("prompt-inject", [{ range: sel, text, forceMoveMarkers: true }]);
```

## Registration

These adapters are **opt-in**. Hosts that do not bundle the editor MUST NOT load the adapter (keeps bundle size minimal).

## Failure mode

If the editor instance cannot be located: return `{ ok:false, reason:"TargetDetached" }`. The injection layer then falls back to the next strategy in `06-injection-contract/02-paste-strategies.md`.

## Acceptance

- [ ] The implementation satisfies the `04 — Rich Editor Adapters (ProseMirror / Lexical / CodeMirror / Monaco)` contract in this file and the folder-level acceptance target: textarea, contenteditable, and rich-editor adapters expose the same injection contract.
- [ ] Verification passes when `E2E-adapter-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
