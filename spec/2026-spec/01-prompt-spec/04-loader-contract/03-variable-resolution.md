# T38 · Variable resolution

**Created:** 2026-06-02

How `{{name}}` placeholders in `prompt.md` become real text at
`render()` time.

## Placeholder syntax recap

- `{{name}}` where `name` matches `^[a-zA-Z_][a-zA-Z0-9_.-]*$`.
- Escape: `\{{` renders as literal `{{`.
- Unmatched closing `}}` is treated as literal text.

## Resolution order (highest precedence first)

1. **Caller-supplied `ctx.vars[name]`** — wins over everything.
2. **Editor-derived variables** (only if `ctx.editor` provided):
   - `{{selection}}` → `ctx.editor.selection`
   - `{{cursor}}` → empty string; used to mark insertion point in
     advanced adapters.
   - `{{before}}` / `{{after}}` → `ctx.editor.before` / `ctx.editor.after`.
3. **Built-in clock variables** (from `ctx.now ?? new Date()`):
   - `{{date}}` → UTC ISO date for storage; UI renders in the user's local
      timezone. Integrators may override by supplying `vars.date`. Format: `YYYY-MM-DD`.
   - `{{time}}` → UTC `HH:mm` for storage; UI renders local time.
   - `{{datetime}}` → UTC `YYYY-MM-DD HH:mm` for storage; UI renders local date-time.
   - `{{iso}}` → UTC ISO-8601 (`2026-06-02T03:14:00Z`).
4. **Empty default** — unresolved placeholders render as empty string
   **and** emit an `unresolved-variable` warning event (see T39) carrying
   `{ name, promptSlug }`. They are NOT left as `{{name}}` literals,
   because that text often confuses downstream chatbots.

## Dotted names

`{{foo.bar}}` is looked up as `ctx.vars["foo.bar"]` first (flat-key
match), then as `ctx.vars.foo?.bar` if `foo` is an object. The flat-key
form is the recommended public interface; nested access is supported
for ergonomic call-sites only.

## Determinism

`render` is pure for fixed `(prompt, ctx)`. When `ctx.now` is omitted
the call is non-deterministic — tests MUST supply `ctx.now` to make
clock variables stable.

## Worked example

```
Body:   Next, today is {{date}} (run for {{ticket}}).
ctx:    { vars: { ticket: "ABC-123" }, now: 2026-06-02T03:14:00Z }
Render: "Next, today is 2026-06-02 (run for ABC-123)."
```

## Acceptance

- [ ] The implementation satisfies the `T38 · Variable resolution` contract in this file and the folder-level acceptance target: loader calls return typed successes, typed errors, and bounded cache behavior.
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
