# T27 · `PromptCategory` shape + free-tag fallback

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Categories group prompts in the dropdown chip row. They are intentionally
lightweight — a category is essentially a styled tag.

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `slug` | string | yes | Lower-kebab, e.g. `automation`, `code-coverage`. Same regex as Prompt slug. |
| `label` | string | yes | Human label shown on the chip. ≤ 20 chars. |
| `order` | number | yes | Chip display order; ties broken by `label`. |

```json
{ "slug": "automation", "label": "Automation", "order": 10 }
```

## Free-tag fallback

If a `Prompt.categories[]` entry references a slug that is **not**
registered in the `PromptCategory` table, the UI MUST still render a
chip for it, using:

- `label` = title-cased slug with hyphens → spaces (`code-coverage` → `Code Coverage`).
- `order` = `Number.MAX_SAFE_INTEGER` (sorts last).

Rationale: lets users add ad-hoc categories without a registration
step, while still letting integrators curate a primary set.

## Reserved slugs

- `all` — implicit virtual category; selecting it shows every prompt. Never store a `PromptCategory` with `slug = "all"`.
- `uncategorised` — implicit; matches prompts whose `categories` array is empty.
