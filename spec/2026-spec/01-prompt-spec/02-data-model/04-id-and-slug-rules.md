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

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.
