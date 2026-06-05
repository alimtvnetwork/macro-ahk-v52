# 01 — Editor Adapter Interface

**Date:** 2026-06-02
**Task:** T51

## Purpose

Decouple paste/inject logic from any specific host editor (ContentEditable div, textarea, ProseMirror, CodeMirror, Monaco, Lexical, Slate, etc.). Each host registers an **EditorAdapter** that the injection contract calls.

## Interface

```ts
export interface EditorAdapter {
  /** Stable id, e.g. "contenteditable", "textarea", "prosemirror". */
  readonly id: string;

  /** Return true if this adapter can drive the given target element. */
  canHandle(target: Element): boolean;

  /** Focus the target (no-op if already focused). */
  focus(target: Element): void;

  /** Insert text at the current caret / selection. MUST preserve undo if possible. */
  insertText(target: Element, text: string, opts?: InsertOptions): Promise<InsertResult>;

  /** Read the current plain-text value (for verification). */
  readValue(target: Element): string;

  /** Optional: provide caret offset for ??? snippet expansion. */
  getCaret?(target: Element): { start: number; end: number } | null;
}

export interface InsertOptions {
  replaceSelection?: boolean;   // default true
  moveCaretToEnd?: boolean;     // default true
  preserveUndo?: boolean;       // default true
}

export interface InsertResult {
  ok: boolean;
  insertedLength: number;
  reason?: InsertFailureReason;
}

export type InsertFailureReason =
  | "TargetDetached"
  | "ReadOnly"
  | "RejectedByEditor"
  | "Timeout";
```

## Registration

Adapters register into a singleton **AdapterRegistry** at host bootstrap:

```ts
AdapterRegistry.register(new ContentEditableAdapter());
AdapterRegistry.register(new TextareaAdapter());
```

Resolution order: **last-registered wins** for matching `canHandle`. This lets hosts override defaults.

## Acceptance

- [ ] The implementation satisfies the `01 — Editor Adapter Interface` contract in this file and the folder-level acceptance target: textarea, contenteditable, and rich-editor adapters expose the same injection contract.
- [ ] Verification passes when `E2E-adapter-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
