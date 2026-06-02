# Prompts Panel — Filter & Search

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Deterministic filtering. **No fuzzy matching.** No third-party libraries. Sequential, fail-fast.

## Inputs

- `Query` — the search input value (trimmed, lowercased for comparison; original kept for display highlighting).
- `ActiveCategory` — selected chip slug, or `"all"`.
- `Source` — `"prompts"` or `"macros"` (driven by the active tab).

## Match function (per row)

```ts
function matches(row: PromptRow | MacroRow, query: string, activeCategory: string): boolean {
  const q = query.trim().toLowerCase();
  const categoryOk = activeCategory === "all" || row.Category?.toLowerCase() === activeCategory;
  if (!categoryOk) { return false; }
  if (q.length === 0) { return true; }

  const hay = [
    row.Slug,
    row.Title,
    row.Category ?? "",
    ...(row.Tags ?? []),
  ].map((s) => s.toLowerCase());

  return hay.some((field) => field.includes(q));
}
```

Rules:
- Plain substring (`String.prototype.includes`) on each indexed field.
- Whitespace in `Query` is preserved (multi-word queries are a single substring, not a token AND/OR).
- Case-insensitive via lowercasing both sides.
- `Description` and `Body` are **not** searched (too noisy, too long; would defeat the substring contract).
- No regex special-char escaping needed because we don't compile regex.
- No Levenshtein, no trigram, no rank score — order is by `IsFavorite DESC, NumericPrefix ASC, Slug ASC` regardless of query.

## Performance

- Index is built once at bundle-load and re-built only on `Prompts.LastSeededBuildHash` change.
- Filtering is `O(N · F)` where N ≤ ~500 and F = 4 fields; runs synchronously without RAF batching.
- Debounce search input by 80ms via `setTimeout` (cleared on each keystroke; paired teardown per `mem://standards/timer-and-observer-teardown`).

## Highlighting

- Matched substring rendered with `<mark>` wrapping inside `Title` and `Slug` only.
- Highlight uses the original `Query` (not lowercased) so display preserves the user's casing.
- One pass per row; first occurrence per field.

## Empty-state copy

| Condition                                       | Message                                                      |
|-------------------------------------------------|--------------------------------------------------------------|
| `Query.length === 0` and `ActiveCategory==="all"` and 0 rows | `"No prompts loaded."` + `[Retry seed]`               |
| `Query.length === 0` and category filter yields 0 rows       | `"No prompts in this category."` + `[Show all]`        |
| `Query.length > 0` and 0 rows                                | `"No prompts match \"<original-query>\"."` + `[Clear]` |

All strings are wrapped in the existing i18n hook (English-only for now).

## Failure handling

If the index build throws (corrupt cache), the panel renders the boot failure surface; never silently shows an empty list. Logged via `RiseupAsiaMacroExt.Logger.error()` (`mem://standards/error-logging-via-namespace-logger`) with `Reason="PromptsIndexBuildFailed"`, `ReasonDetail`, full `VariableContext[]` listing the offending row's `Slug` and field. No retry (`mem://constraints/no-retry-policy`).

## Test coverage

- Pure-function tests for `matches()` over a 12-row fixture:
  - Empty query returns all rows that match category.
  - Substring query matches across `Slug`, `Title`, `Category`, `Tags`.
  - Description/Body are NOT searched (assert no match when the substring lives only there).
  - Case-insensitive: `"AUDIT"` and `"audit"` return identical sets.
- Debounce test: 5 rapid keystrokes within 60ms trigger exactly one filter pass.
- Highlight test: original casing preserved in `<mark>` output.
