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
