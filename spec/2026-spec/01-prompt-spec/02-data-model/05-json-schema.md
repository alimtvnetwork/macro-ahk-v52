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
