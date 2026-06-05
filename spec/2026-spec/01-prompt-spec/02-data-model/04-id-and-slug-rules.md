# T29 · `id` and `slug` rules

**Created:** 2026-06-02

`id` and `slug` solve different problems. Implementations MUST keep
them separate.

## `id`

- Opaque, globally unique within a `PromptStore`.
- Format is implementation-defined. Recommended: UUID v4.
- Shipped defaults SHOULD use the deterministic form `default-<slug>`
  so re-installs do not duplicate them.
- Never displayed to the End User.
- Never typed by the End User.

## `slug`

- The logical name of the prompt.
- Stable across edits (renaming a prompt does **not** change its slug
  unless the user explicitly chooses to).
- Used in URLs, file names, import/export bundles, and equality checks.

### Regex (authoritative)

```
^[a-z0-9]+(-[a-z0-9]+)*$
```

- Lower-case ASCII letters, digits, and single hyphens.
- No leading/trailing hyphen, no consecutive hyphens.
- 1–60 characters.

### Reserved slugs

`all`, `uncategorised`, `new`, `edit`, `delete`, `import`, `export`,
`settings` — these collide with UI routes/actions and MUST be rejected
on `save`.

## Collision policy

When `importMany(mode = "rename")` faces an existing slug, the
implementation MUST append `-2`, `-3`, … until free:

```
existing : my-prompt
incoming : my-prompt          → renamed to my-prompt-2
incoming : my-prompt-2        → renamed to my-prompt-3
```

The new slug is reported in `ImportReport.renamed`.

When `mode = "skip"` the incoming record is dropped; when
`mode = "replace"` the existing record is overwritten (id preserved).

## Display ↔ slug derivation

When the End User creates a prompt by typing only a title, the UI
SHOULD auto-derive a slug:

1. Lower-case.
2. Replace runs of non-`[a-z0-9]` with single `-`.
3. Trim leading/trailing `-`.
4. Truncate to 60 chars.
5. If the result is empty or reserved, prompt the user to type a slug.

Auto-derivation is a UI convenience; the canonical slug always comes
from the saved record.

## Acceptance

- [ ] The implementation satisfies the `T29 · id and slug rules` contract in this file and the folder-level acceptance target: Prompt, PromptCategory, and PromptStore contracts hold across storage implementations.
- [ ] Verification passes when `UT-data-001..010` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.

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

