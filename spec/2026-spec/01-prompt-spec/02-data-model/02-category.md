# T27 · `PromptCategory` shape + free-tag fallback

**Created:** 2026-06-02

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

## Acceptance

- [ ] The implementation satisfies the `T27 · PromptCategory shape + free-tag fallback` contract in this file and the folder-level acceptance target: Prompt, PromptCategory, and PromptStore contracts hold across storage implementations.
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

