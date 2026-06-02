# Variables & Templating — Spec Index

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Prompt bodies are **templates**: any `{{ VarName }}` placeholder is resolved
against a 5-tier waterfall before the prompt is injected. Variables are the
glue between a generic prompt and a macro that reuses it many times with
different inputs.

## Read order

1. [`00-overview.md`](./00-overview.md) — why variables, when to use, examples.
2. [`01-syntax.md`](./01-syntax.md) — `{{ VarName }}` Mustache-lite + escaping.
3. [`02-declaration.md`](./02-declaration.md) — `info.json` `Variables[]` schema.
4. [`03-resolution-order.md`](./03-resolution-order.md) — 5-tier waterfall.
5. [`04-types.md`](./04-types.md) — supported `Type` values + coercion.
6. [`05-built-in-context.md`](./05-built-in-context.md) — `RunId`, `Now`, `LoopCount`, `LastScore`, `MacroSlug`.
7. [`06-validation.md`](./06-validation.md) — Ajv schema + failure-log shape.
8. [`07-sensitive-masking.md`](./07-sensitive-masking.md) — `Sensitive: true` redaction.
9. [`08-ui-prompting.md`](./08-ui-prompting.md) — inline form when required vars missing.

## Invariants

- **No logic** — placeholders are name lookups, never expressions.
- **Fail-fast** — unresolved required variable raises `MissingVariable`
  with the full `VariableContext[]` (`mem://standards/verbose-logging-and-failure-diagnostics`).
- **Sensitive masking** — values with `Sensitive: true` are masked in logs,
  manifest, and exported bundles.
- **No nested interpolation** — a value containing `{{ … }}` after first-pass
  resolution raises `VariableInjection` (defence against template injection
  via supplied values).
