# T39 · Error modes

**Created:** 2026-06-02

Every loader / store failure surfaces as a **typed error** with a
short `Reason` code and a human-readable `ReasonDetail`. This matches
the project-wide failure-log contract.

## Error shape

```ts
export interface PromptError extends Error {
  reason:        PromptErrorReason;   // short code (see table)
  reasonDetail:  string;              // one-line human description
  cause?:        unknown;             // underlying error if any
  context?: {
    slug?:    string;
    id?:      string;
    field?:   string;                 // JSON Pointer for schema errors
    path?:    string;                 // file path for fs-backed stores
  };
}

export type PromptErrorReason =
  | "NotFound"
  | "ParseFailed"
  | "SchemaInvalid"
  | "SlugCollision"
  | "DefaultPromptImmutable"
  | "StoreUnavailable"
  | "UnsupportedBundleVersion"
  | "UnresolvedVariable"     // warning-level, not thrown
  | "Unknown";
```

## When each reason fires

| Reason | Thrown by | Trigger |
|---|---|---|
| `NotFound` | `get` / `getBySlug` / `render` | Slug/id absent from store. Returns `null` for `get*`, throws for `render`. |
| `ParseFailed` | Loader (fs-backed) | `info.json` not valid JSON, or `prompt.md` not valid UTF-8. |
| `SchemaInvalid` | Loader, `save`, `importMany` | Record fails JSON Schema (T30). `context.field` carries the JSON Pointer. |
| `SlugCollision` | `save`, `importMany` (`replace`/`rename`), Loader | Two records share a slug, or folder slug ≠ `info.json` slug. |
| `DefaultPromptImmutable` | `delete`, `save` | Caller tried to delete an `isDefault: true` record or change its slug. |
| `StoreUnavailable` | Store | Backend offline / permission denied / disk full. Includes original error in `cause`. |
| `UnsupportedBundleVersion` | Import | `manifest.json → bundleVersion` not in the supported set (T35). |
| `UnresolvedVariable` | `render` | **Emitted as event**, not thrown — see T38 §4. |
| `Unknown` | Any | Wraps an unexpected throw; `cause` always set. |

## Logging contract

All thrown `PromptError`s MUST be logged with:

- `Reason` = the reason code
- `ReasonDetail` = the human one-liner
- `SelectorAttempts: []` (empty for loader/store errors; populated by
  injection layer in `06-injection-contract/`)
- `VariableContext: []` (populated by `render` for `UnresolvedVariable`
  with `{ name, source: "prompt-body", row, column, resolvedValue: null,
  type: "string", reason: "no-match-in-ctx" }`).

This makes loader failures grep-compatible with the rest of the
project's failure logs.

## What is NOT an error

- Empty prompt list — `loadAll()` returns `[]`.
- Hidden defaults — silently skipped during merge.
- Extra unknown keys in `info.json` — preserved, ignored.

## Acceptance

- [ ] The implementation satisfies the `T39 · Error modes` contract in this file and the folder-level acceptance target: loader calls return typed successes, typed errors, and bounded cache behavior.
- [ ] Verification passes when `UT-loader-001..012` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** expose the loader as `loadPrompts(): Promise<LoaderResult>` returning `{ prompts, categories, errors }` — never throw; surface errors in the result object.
- **MUST** populate `JsonCopy` + `HtmlCopy` IndexedDB caches in the same transaction; partial writes are rejected with `Reason="LoaderCacheSplit"`.
- **MUST** resolve every `{{var}}` placeholder via the variable resolver from `04-loader-contract/03-variable-resolution.md`; unresolved variables throw `Reason="VariableUnresolved"` with the full `VariableContext[]`.
- **MUST** invalidate caches by **manifest hash**, never by wall-clock; auto-load only on hash change.

## Pitfalls / Counter-examples

- ❌ `loadPrompts()` throws and the UI shows a blank dropdown. ✅ Return `LoaderResult.errors` and render an empty-state with the reason chip.
- ❌ Writing `JsonCopy` then awaiting before writing `HtmlCopy`. ✅ Single IndexedDB transaction; both succeed or both rollback.
- ❌ Silent `?? ""` for missing variables. ✅ Throw with full `VariableContext` (name/source/row/column/resolvedValue/type/reason).
- ❌ Polling the manifest every N seconds. ✅ Manual-load + hash-diff (see `mem://features/prompt-management`).
- ❌ Retrying a failed load with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
