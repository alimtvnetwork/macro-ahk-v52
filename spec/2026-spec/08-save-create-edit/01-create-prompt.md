# 01 — Create Prompt

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T56

## Entry points

- Dropdown footer button **"+ New prompt"**.
- Keyboard shortcut from dropdown: `HOST:` configurable (default `Ctrl+N`).
- Programmatic: `PromptStore.create(draft)`.

## Draft shape

```ts
interface PromptDraft {
  title: string;            // required, 1..120 chars
  slug?: string;            // optional; auto-derived from title if omitted
  category?: string;        // optional category slug; default "uncategorized"
  body: string;             // markdown body, 0..65536 chars (soft cap)
  tags?: string[];          // optional, max 16
}
```

## Validation pipeline

1. Trim title; reject empty.
2. Derive slug if absent: lowercase → strip diacritics → replace `[^a-z0-9]+` with `-` → trim `-`.
3. Verify slug matches `^[a-z0-9]+(-[a-z0-9]+)*$` (see `02-data-model/04-id-and-slug-rules.md`).
4. Check slug collision in the **user namespace only** (defaults are read-only — see `03-prompt-source-format/04-default-vs-user-prompts.md`).
   - On collision: append `-2`, `-3`, … until free, OR surface `SlugCollision` error if the caller opted out of auto-suffix.
5. Run schema validation (`02-data-model/05-json-schema.md`).
6. Persist via `PromptStore.create`.

## Post-create

- Invalidate the `"prompts:all"` cache.
- Fire `PromptStoreEvent { kind: "created", slug }`.
- Return the new fully-resolved `Prompt`.
