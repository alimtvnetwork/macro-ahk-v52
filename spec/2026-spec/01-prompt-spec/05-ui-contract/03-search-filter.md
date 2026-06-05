# T43 · Search and filter

**Created:** 2026-06-02

Two orthogonal filters narrow the visible prompt list:

1. **Category chip** (single-select; default `[All]`).
2. **Search query** (free text from the search box).

The visible set is the **intersection** of both.

## Category filter

- `[All]` ⇒ no category constraint.
- Any other chip ⇒ keep prompts whose `categories[]` contains the
  chip's slug.
- Free-tag fallback chips (T27 §"Free-tag fallback") behave identically.
- Switching chips preserves the search query.

## Search match algorithm

For each prompt, compute a `score`:

| Field | Weight | Match type |
|---|---|---|
| `title` | 5 | case-insensitive substring; +5 bonus on prefix match |
| `slug` | 3 | case-insensitive substring |
| `categories[]` (joined) | 2 | case-insensitive substring |
| `body` | 1 | case-insensitive substring; capped contribution of 1 regardless of hit count |

- A prompt is **kept** iff `score > 0`.
- Results sorted by `score DESC`, then by `(category, order, title)`
  (same tie-break as the unfiltered list).
- Whitespace-only query ⇒ no search constraint (chip still applies).

## Multi-word queries

The query is split on whitespace. **All** tokens must match
(AND-semantics) somewhere in the searchable fields. Token scores are
summed.

## Performance budget

- Catalogue size ≤ 1 000 prompts: synchronous filter on every keystroke.
- Catalogue size > 1 000: debounce keystrokes by 80 ms; never block
  longer than 16 ms per frame.

## Body-search and verbose mode

`body` is **always** searched (cheap substring). The 64 KiB body cap
(T33) keeps the per-prompt cost bounded. Verbose-mode logging
(`Project.VerboseLogging`) does not change matching — it only affects
what gets persisted in logs.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.
