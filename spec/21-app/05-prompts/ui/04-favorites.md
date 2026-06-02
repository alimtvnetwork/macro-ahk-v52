# Prompts Panel — Favorites

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Favorites pin prompts (or macros) to the top of the list for fast access. Per-user, per-extension; no sync to a cloud service (no Supabase — `mem://constraints/no-supabase`).

## Toggle interaction

- Each row has a star affordance in the `[⋯]` overflow menu (`"Pin to favorites" / "Unpin"`) and a hotkey `F` while the row has keyboard focus.
- The star icon also renders as a leading glyph on the row when pinned.
- Toggle is optimistic: UI flips immediately; persistence is awaited; on failure the toggle reverts and a non-blocking toast surfaces the failure-log shape.

## Persistence

Stored on the existing prompt / macro records — no new table.

- SQLite columns: `IsFavorite INTEGER NOT NULL DEFAULT 0` on `Prompts`, `MacroPrompts`, and `Macros`.
- Toggling writes to the corresponding `*UserOverride` row (creating it if absent) so built-in defaults are never mutated in place. Mirrors the user-override pattern from `macro-prompts/05-seed-bundle.md`.
- Identity-only — no rename of legacy columns (`mem://constraints/no-storage-pascalcase-migration`).

## Resolution at render time

For each row in the list (prompts or macros tab):

```
EffectiveIsFavorite =
   UserOverride.IsFavorite      if a UserOverride row exists,
   else BuiltIn.IsFavorite      (default 0)
```

Resolution is deterministic and sequential; no fallbacks, no retries (`mem://constraints/no-retry-policy`).

## Ordering

Favorites render in a dedicated `★ FAVORITES` section above the main list (`ui/01-panel-layout.md` wireframe). Within the section:

```
ORDER BY FavoritedAt ASC, Slug ASC
```

`FavoritedAt` is a sibling column `FavoritedAt TEXT NULL` (ISO-8601 KL); set when `IsFavorite` flips 0→1, cleared on 1→0.

If `FavoritedAt` is null (legacy / migrated), falls back to `UpdatedAt`.

## Cross-tab sync

Mutations broadcast `MARCO_PROMPTS_SYNC` on the existing `marco-prompts-sync` BroadcastChannel (already used by the prompts subsystem — `mem://features/prompt-management`). Payload:

```json
{ "Kind": "FavoriteToggled", "Source": "prompts|macro-prompts|macros", "Slug": "...", "IsFavorite": true, "FavoritedAt": "2026-06-02T10:15:00+08:00" }
```

Listeners on every open panel re-resolve `EffectiveIsFavorite` for that slug and update in place (no full re-render). Listener registration is paired with teardown via `addEventListener` + `pagehide` (`mem://standards/timer-and-observer-teardown`).

## Limits & guards

- Hard cap: **50** favorites per source (prompts, macro-prompts, macros tracked independently). Attempting to pin beyond the cap raises `Reason="FavoritesLimitReached"` with `ReasonDetail="<source>: 50/50"`; UI shows a toast and the toggle does not flip.
- Cap is enforced server-side (SQLite `BEFORE UPDATE` trigger) AND client-side (button disabled at cap with tooltip).
- No retry on quota failure.

## Failure handling

Per repo standard (`mem://standards/error-logging-via-namespace-logger`, `mem://standards/verbose-logging-and-failure-diagnostics`):

```
Reason          : FavoriteToggleFailed | FavoritesLimitReached
ReasonDetail    : <sqlite error | quota detail>
VariableContext : [{ name: "Slug", source: "Row", resolvedValue: "<slug>", type: "string", reason: "<…>" },
                   { name: "Source", source: "ActiveTab", resolvedValue: "prompts|macro-prompts|macros", type: "string", reason: "ok" }]
```

## Test coverage

- Toggle round-trip: pin → unpin → pin; persists across panel close/reopen.
- Built-in default `IsFavorite:true` is honoured until the user unpins (creates an override with `IsFavorite=0`).
- Limit guard: 51st pin fails with `FavoritesLimitReached`.
- Cross-tab: two open panels stay in sync via `marco-prompts-sync`.
- Optimistic rollback: simulated SQLite failure reverts the toggle within one frame.
