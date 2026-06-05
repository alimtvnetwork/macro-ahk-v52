# T30 · JSON Schema for `Prompt` and `PromptCategory`

**Created:** 2026-06-02

Use these schemas in any implementation language to validate
on-disk / over-the-wire records. Schema dialect: **JSON Schema 2020-12**.

## `prompt.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.invalid/prompts/prompt.schema.json",
  "title": "Prompt",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "id", "slug", "title", "version",
    "categories", "body", "isDefault", "order",
    "createdAt", "updatedAt"
  ],
  "properties": {
    "id":         { "type": "string", "minLength": 1, "maxLength": 128 },
    "slug":       { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$", "maxLength": 60 },
    "title":      { "type": "string", "minLength": 1, "maxLength": 60 },
    "version":    { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "author":     { "type": "string", "maxLength": 120 },
    "categories": { "type": "array",  "items": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" }, "uniqueItems": true },
    "body":       { "type": "string", "minLength": 1 },
    "isDefault":  { "type": "boolean" },
    "order":      { "type": "integer", "minimum": 0 },
    "createdAt":  { "type": "string", "format": "date-time" },
    "updatedAt":  { "type": "string", "format": "date-time" }
  }
}
```

## `prompt-category.schema.json`

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.invalid/prompts/prompt-category.schema.json",
  "title": "PromptCategory",
  "type": "object",
  "additionalProperties": false,
  "required": ["slug", "label", "order"],
  "properties": {
    "slug":  { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$", "not": { "enum": ["all", "uncategorised"] } },
    "label": { "type": "string", "minLength": 1, "maxLength": 20 },
    "order": { "type": "integer", "minimum": 0 }
  }
}
```

## Validation expectations

- `PromptStore.save` MUST reject any record that fails the schema with
  the typed error `SchemaInvalid` (`04-loader-contract/04-error-modes.md`).
- `importMany` MUST validate every incoming record before any write;
  the entire batch is rejected on the first violation when
  `mode = "replace"` or `"rename"`; `mode = "skip"` drops only the
  offending record and continues.
- Validation errors MUST include the JSON Pointer of the failing field
  (e.g. `/categories/2`) and a one-line human reason.

## Acceptance

- [ ] The implementation satisfies the `T30 · JSON Schema for Prompt and PromptCategory` contract in this file and the folder-level acceptance target: Prompt, PromptCategory, and PromptStore contracts hold across storage implementations.
- [ ] Verification passes when `UT-data-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** declare every Prompt/Category field with a concrete TypeScript type in `02-data-model/03-store-interface.md` — no `unknown`, no `any`, no inline object literals.
- **MUST** generate slugs via `slugify(name, { lower: true, strict: true })` capped at `SLUG_MAX_LEN` (64) characters; collisions append `-2`, `-3`, … sequentially.
- **MUST** validate every imported prompt against `schemas/prompt.schema.json` before persistence; schema mismatches throw `Reason="SchemaMismatch"` and HALT the import.
- **MUST** treat `id` as immutable once written; renames change `name`/`slug` only and emit `PROMPT_RENAMED` with both old and new slugs.

## Pitfalls / Counter-examples

- ❌ Storing `category: string` instead of `categoryId: CategoryId` — breaks rename/merge. ✅ Reference by stable id; resolve name at render time.
- ❌ Allowing duplicate slugs across categories. ✅ Enforce uniqueness in `04-id-and-slug-rules.md` with a single composite index `(categoryId, slug)`.
- ❌ Mutating an imported prompt object in place. ✅ Clone via `structuredClone` before validation so the source bundle stays comparable.
- ❌ Persisting `createdAt` as a localized string. ✅ Store `Date.now()` UTC ms; render with the user-local timezone.
- ❌ Wide `interface Prompt { [k: string]: unknown }`. ✅ Closed shape — every key declared (see `mem://standards/unknown-usage-policy`).

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
