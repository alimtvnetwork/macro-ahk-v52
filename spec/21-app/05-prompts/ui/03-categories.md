# Prompts Panel — Categories

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Categories group prompts and macros. They drive the chip filter row in the panel header and the `Category` field in every `info.json` / `.macro.json`.

## Data shape

Persisted to SQLite table `PromptCategories` (PascalCase columns; identity-only per `mem://constraints/no-storage-pascalcase-migration`):

```
Slug       TEXT PRIMARY KEY   -- kebab-case, regex same as prompt slug
Title      TEXT NOT NULL      -- display name, ≤ 40 chars
ColorHsl   TEXT NOT NULL      -- HSL token, e.g. "38 92% 56%"
SortOrder  INTEGER NOT NULL   -- ascending; ties broken by Slug
IsBuiltIn  INTEGER NOT NULL   -- 0/1; built-in categories cannot be deleted
UpdatedAt  TEXT NOT NULL      -- ISO-8601 Asia/Kuala_Lumpur
```

## Built-in categories (seeded)

| Slug      | Title       | ColorHsl       | SortOrder |
|-----------|-------------|----------------|-----------|
| `general` | General     | `220 10% 60%`  | 10        |
| `audit`   | Audit       | `38 92% 56%`   | 20        |
| `spec`    | Spec        | `160 84% 45%`  | 30        |
| `memory`  | Memory      | `200 92% 56%`  | 40        |
| `macro`   | Macro       | `280 70% 60%`  | 50        |

Seeded by `LoadBundledDefaultPrompts` alongside the prompts bundle (same idempotency hash gate as `mem://features/prompt-management`). `IsBuiltIn = 1` for all five.

## CRUD operations

| Op       | UI entry                                          | Validation                                                                        | Failure code                       |
|----------|---------------------------------------------------|-----------------------------------------------------------------------------------|------------------------------------|
| Create   | `[ + ]` chip at end of strip → inline dialog      | Slug regex; Slug unique; Title 1–40; ColorHsl matches `^\d{1,3} \d{1,3}% \d{1,3}%$` | `CategoryValidationFailed`         |
| Rename   | Right-click chip → "Rename"                       | Title 1–40; Slug immutable.                                                       | `CategoryValidationFailed`         |
| Recolor  | Right-click chip → "Color…" → HSL picker          | ColorHsl pattern.                                                                 | `CategoryValidationFailed`         |
| Reorder  | Drag chip horizontally (pointer + keyboard)        | New SortOrder integer; persists on drop.                                          | n/a (no validation failure)        |
| Delete   | Right-click chip → "Delete"                       | Forbidden when `IsBuiltIn=1` OR any prompt/macro still references the slug.       | `CategoryInUse` / `CategoryBuiltIn`|

Failure log shape per repo standard (`mem://standards/verbose-logging-and-failure-diagnostics`): `Reason`, `ReasonDetail`, `VariableContext[]` listing the offending `Slug` and field.

## Ordering rules

1. Built-in categories always render first, sorted by `SortOrder`.
2. User categories render after, sorted by `SortOrder` then `Slug`.
3. `[ All ]` chip is synthetic (not a row in the table) and always leftmost.
4. `[ + ]` chip is synthetic and always rightmost.

## Color application

Chip background uses the category's `ColorHsl` at 18% lightness mix; chip text uses fg token. Active chip uses the full color as background with computed contrast fg.

```css
--chip-bg:     hsl(var(--cat-hsl) / 0.18);
--chip-bg-on:  hsl(var(--cat-hsl));
--chip-fg:     hsl(220 10% 90%);
--chip-fg-on:  hsl(220 14% 10%);
```

`--cat-hsl` is set per-chip via inline `style` from `ColorHsl`. No raw colors in components (`mem://preferences/dark-only-theme`).

## Cross-tab sync

Category mutations broadcast `PROMPT_CATEGORIES_CHANGED` via the existing message bus (`mem://architecture/message-relay-system`). Every open panel listens and re-renders its chip strip. Listener is paired with teardown (`mem://standards/timer-and-observer-teardown`).

## Test coverage

- Seed test: bundled defaults insert exactly 5 built-in categories; second seed is a noop (hash gate).
- CRUD: create / rename / recolor / reorder / delete round-trip.
- Delete blocked: attempting to delete a category referenced by ≥1 prompt or macro raises `CategoryInUse` with the referencing slug list in `VariableContext[]`.
- Built-in protection: `IsBuiltIn=1` rejects delete with `CategoryBuiltIn`.
