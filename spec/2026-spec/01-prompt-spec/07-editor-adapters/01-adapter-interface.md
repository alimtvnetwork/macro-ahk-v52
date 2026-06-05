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
