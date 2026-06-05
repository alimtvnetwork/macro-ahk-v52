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
