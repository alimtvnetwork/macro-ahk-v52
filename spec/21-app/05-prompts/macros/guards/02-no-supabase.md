# Guard — No Supabase

Re-statement of the Core memory rule, scoped to the Prompts/Macros subsystem.

## Ban
The Prompts/Macros engine MUST NOT use Supabase for any purpose — auth, database, edge functions, storage, realtime, or SDKs. The ban is total.

## Allowed persistence layers (only these)

| Layer | Used for |
|-------|----------|
| `chrome.storage.local` | `MacroRun.<RunId>`, `MacroRun.Active.<TabId>`, `PromptsBackupRing`, settings |
| SQLite (existing extension DB) | `Prompts`, `Macros`, `MacroPrompts`, `PromptCategories`, `Favorites`, `PromptsRunHistory` |
| IndexedDB | Existing `JsonCopy` / `HtmlCopy` caches (untouched) |
| Filesystem (`spec/audit/<RunId>/`) | Per-run audit artifacts |

## Forbidden imports (CI-enforced)
The following imports cause CI failure in any file under `src/prompts/**`, `standalone-scripts/macros/**`, `standalone-scripts/macro-prompts/**`:
- `@supabase/*`
- `supabase-js`
- Any URL string matching `/\.supabase\.(co|in)\b/`
- Any env var starting with `SUPABASE_`

## Enforcement
- ESLint rule `no-restricted-imports` lists every forbidden module.
- `scripts/audit-no-supabase.mjs` greps the whole repo for the patterns above and exits non-zero on any match. Wired into `.github/workflows/ci.yml`.
- Pre-commit: same script runs in `husky` hook.

## Rationale
- Project Core rule (`mem://constraints/no-supabase`).
- All Prompts/Macros features can be served by the layers listed above with zero network dependency, matching the extension's offline-first posture.

## Reason code
Any runtime attempt to dynamically load a Supabase URL via `fetch` is intercepted by the existing network guard and logged as `Reason='SupabaseBlocked'`.
