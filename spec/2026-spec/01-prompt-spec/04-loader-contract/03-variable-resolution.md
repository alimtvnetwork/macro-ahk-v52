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
   - `{{date}}` → UTC ISO date for storage; UI renders in the user's local timezone (
     integrator may override by supplying `vars.date`). Format: `YYYY-MM-DD`.
   - `{{time}}` → `HH:mm` in the same zone.
   - `{{datetime}}` → `YYYY-MM-DD HH:mm`.
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
