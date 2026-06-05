# T26 · `Prompt` shape

**Created:** 2026-06-02

The single record type the rest of the spec revolves around.
Keys are written in plain `camelCase`; the integrator is free to
re-case them for their storage backend.

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string | yes | Opaque, globally unique within a store. UUID v4 recommended; `default-<slug>` for shipped defaults. |
| `slug` | string | yes | URL-safe identifier, see `04-id-and-slug-rules.md`. Stable across edits. |
| `title` | string | yes | Human label shown in the dropdown. ≤ 60 chars. |
| `version` | string | yes | SemVer `MAJOR.MINOR.PATCH`. Bumped by Integrator/User on edits. |
| `author` | string | no | Free text. |
| `categories` | string[] | yes | Zero or more category slugs (see `02-category.md`). Empty array = uncategorised. |
| `body` | string | yes | The prompt text itself. May contain `{{variable}}` placeholders (see `04-loader-contract/03-variable-resolution.md`). |
| `isDefault` | boolean | yes | `true` for shipped defaults; `false` for user-created. Defaults cannot be deleted, only hidden. |
| `order` | number | yes | Integer sort key inside its category; lower = earlier. Ties broken by `title`. |
| `createdAt` | ISO-8601 string | yes | UTC. |
| `updatedAt` | ISO-8601 string | yes | UTC; equals `createdAt` on first write. |

## Worked example

```json
{
  "id": "default-next-tasks",
  "slug": "next-tasks",
  "title": "Next Tasks",
  "version": "1.0.0",
  "author": "Prompts Feature Defaults",
  "categories": ["automation"],
  "body": "Next,\n\nList remaining tasks; do one at a time.",
  "isDefault": true,
  "order": 13,
  "createdAt": "2026-03-21T00:00:00Z",
  "updatedAt": "2026-03-21T00:00:00Z"
}
```

## Equality

Two `Prompt` records are considered the same logical prompt iff their
`slug` matches (case-insensitive). `id` distinguishes physical rows;
`slug` distinguishes logical identity.

## Acceptance

- [ ] The implementation satisfies the `T26 · Prompt shape` contract in this file and the folder-level acceptance target: Prompt, PromptCategory, and PromptStore contracts hold across storage implementations.
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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

<!-- audit: inline-types -->

## Type & Schema (canonical)

```typescript
interface Prompt {
  id: string;            // ULID
  slug: string;          // kebab-case, see 04-id-and-slug-rules
  title: string;         // 1..120 chars
  body: string;          // markdown, 1..50_000 chars
  category: string;      // PromptCategory.id or free-tag
  source: 'default' | 'user' | 'import';
  createdAt: string;     // ISO-8601 UTC
  updatedAt: string;     // ISO-8601 UTC
  variables?: ReadonlyArray<{ name: string; default?: string }>;
}
```

```json
{
  "$schema": "https://json-schema.org/draft-07/schema#",
  "$id": "Prompt",
  "type": "object",
  "required": ["id","slug","title","body","category","source","createdAt","updatedAt"],
  "properties": {
    "id":        { "type":"string", "pattern":"^[0-9A-HJKMNP-TV-Z]{26}$" },
    "slug":      { "type":"string", "pattern":"^[a-z0-9]+(?:-[a-z0-9]+)*$", "maxLength":80 },
    "title":     { "type":"string", "minLength":1, "maxLength":120 },
    "body":      { "type":"string", "minLength":1, "maxLength":50000 },
    "category":  { "type":"string", "minLength":1, "maxLength":64 },
    "source":    { "enum":["default","user","import"] },
    "createdAt": { "type":"string", "format":"date-time" },
    "updatedAt": { "type":"string", "format":"date-time" },
    "variables": {
      "type":"array",
      "items": { "type":"object", "required":["name"],
                 "properties": { "name":{"type":"string"}, "default":{"type":"string"} } }
    }
  },
  "additionalProperties": false
}
```
