# Storage Contract — `chrome.storage.local` Keys

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)
**Invariant:** Identity-only mapping. **No** PascalCase rewrite of existing
`StoredProject` keys (`mem://constraints/no-storage-pascalcase-migration`).
**Invariant:** No Supabase anywhere (`mem://constraints/no-supabase`).

## Key namespace

All macro-feature keys live under the `Macros.*` and `MacroRunState.*`
prefixes. Existing prompt keys are untouched.

| Key                              | Shape (TS)                          | Writer                          | TTL          |
|----------------------------------|-------------------------------------|---------------------------------|--------------|
| `Macros.Index`                   | `{ Slugs: string[]; UpdatedAt: string }` | Macro CRUD               | none         |
| `Macros.Item.<Slug>`             | `MacroDefinition` (validated)       | Save / Import                   | none         |
| `Macros.Categories`              | `{ Categories: { Slug, Label, ColorToken }[] }` | Category CRUD       | none         |
| `MacroRunState.<RunId>`          | `MacroRunState` (see `02-run-model.md`) | Engine after every step      | 7 days       |
| `MacroRunState.Active.<TabId>`   | `{ RunId: string; UpdatedAt: string }`  | Engine on RunStarted / RunEnded | run-lifetime |
| `MacroRunLog.<RunId>`            | `MacroFailureLog[]` (capped 200)    | Engine on every failure         | 7 days       |
| `PromptsBackup.<Timestamp>`      | `{ Prompts, MacroPrompts, Macros, Categories }` | Replace flow         | 30 days      |
| `Macros.RunHistory`              | `{ Runs: { RunId, MacroSlug, Status, FinishedAt }[] }` (capped 50) | Engine on terminal | rolling 50 |

`<Slug>` MUST match `^[a-z0-9][a-z0-9-]{1,63}$`. `<RunId>` and `<Timestamp>`
follow `<slug>-<yyyymmdd>-<HHmmss>` and `<yyyymmdd>-<HHmmss>` respectively
(Asia/Kuala_Lumpur).

## TTL pruning

- Lazy: on background SW boot, scan prefixes and remove entries whose
  `UpdatedAt + TTL < now`.
- Pruning is **non-fatal** — failures log `Reason="StoragePruneFailed"` but
  don't block boot.
- No periodic alarms (avoids per
  `mem://standards/timer-and-observer-teardown`).

## Quota & failure

- `chrome.storage.local` hard quota = 10 MiB (Chromium default; not
  `unlimitedStorage`). Engine MUST check `bytesInUse` before writing
  oversized payloads.
- On quota exceeded → `Reason="StorageQuotaExceeded"`, run transitions to
  `Failed`. **No retry** (`mem://constraints/no-retry-policy`).

## Reads

- Reads use `chrome.storage.local.get` directly; no caching layer.
- Cross-tab sync via existing `marco-prompts-sync` BroadcastChannel for
  prompt CRUD; a parallel `marco-macros-sync` channel is added for macro CRUD
  (Block 7 Task 67).

## Forbidden

- **localStorage** for any macro state (banned site-wide).
- **IndexedDB** for run state (used only for prompt blob cache).
- **OPFS** for run state (used only for SQLite session logs).
- Any **Supabase** SDK / RPC / table reference.
- Renaming existing prompt keys to PascalCase — strictly prohibited.

## Migration policy

There is no v1 → v2 migration. The macro feature is greenfield; first write
creates the keys above with `SchemaVersion: 1`. Future bumps go through the
versioning rules in `engine/06-message-contract.md` (Task 67) and
`json/06-versioning-and-migration.md` (Task 57).
