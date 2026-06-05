# T33 · `prompt.md` body conventions

**Created:** 2026-06-02

The plain-text payload that ends up in `Prompt.body` after loading.

## Rules

1. **Format:** UTF-8 markdown. No frontmatter (metadata lives in
   `info.json`).
2. **Whitespace:** leading/trailing whitespace is preserved exactly.
   The loader MUST NOT trim — some prompts rely on a final blank line.
3. **Line endings:** stored as LF; on Windows checkouts the loader
   normalises CRLF → LF before assigning to `body`.
4. **Empty body:** rejected with `SchemaInvalid` (body has `minLength: 1`).
5. **Maximum size:** soft cap **64 KiB**. Larger bodies are accepted
   but emit a warning event `prompt.body.large` for the integrator.

## Variable placeholders

The body MAY contain placeholders of the form `{{name}}` where `name`
matches `^[a-zA-Z_][a-zA-Z0-9_.-]*$`. Resolution rules and the built-in
variable set are specified in `04-loader-contract/03-variable-resolution.md`.

Authoring conventions:

- Use `{{date}}`, `{{time}}`, `{{selection}}`, `{{cursor}}` for the
  built-ins.
- Custom variables that the host must supply SHOULD be documented
  in the prompt body itself (e.g. a header line `<!-- vars: {{ticket}} -->`),
  because there is no separate manifest for them.
- A literal `{{` can be escaped as `\{{`.

## Minimal example

```
Next,

List remaining tasks; do one at a time. Today is {{date}}.
```

## Acceptance

- [ ] The implementation satisfies the `T33 · prompt.md body conventions` contract in this file and the folder-level acceptance target: prompt source files round-trip through parse and emit without semantic drift.
- [ ] Verification passes when `UT-source-001..008` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.