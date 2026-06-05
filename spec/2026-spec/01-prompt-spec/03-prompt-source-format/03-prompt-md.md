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

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** keep `info.json` at the prompt folder root with exactly the keys defined in `02-info-json.md`; extra keys fail `schemas/prompt.schema.json`.
- **MUST** read `prompt.md` body as UTF-8 with explicit BOM strip; trailing whitespace is preserved verbatim (paste-fidelity).
- **MUST** import/export bundles as ZIP with `prompts-bundle.json` manifest validated by `schemas/prompts-bundle.schema.json` before any disk write.
- **MUST** treat the `default/` folder as read-only at runtime; user edits clone into `user/` and never modify defaults in place.

## Pitfalls / Counter-examples

- ❌ Detecting prompt type by file extension. ✅ Read `info.json#kind` — the source of truth.
- ❌ Auto-rewriting `info.json` with a "last modified" timestamp. ✅ See `mem://constraints/readme-txt-prohibitions` SP-1..SP-7 — no auto time stamps in source files.
- ❌ Streaming a ZIP import directly into IndexedDB without schema validation. ✅ Validate the full bundle in memory first; a single bad entry rejects the whole import.
- ❌ Trimming the prompt body to "clean up" whitespace. ✅ Body is paste-fidelity; trim only at the editor surface, never at the loader.
- ❌ Hardcoding the import path. ✅ Use `STORAGE_PROMPTS_ROOT` constant.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

