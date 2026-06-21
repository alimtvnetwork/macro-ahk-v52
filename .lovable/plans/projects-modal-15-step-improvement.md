# Projects Modal — 15-Step Improvement Plan

**Scope**: macro-controller → Projects dialog + CSV export.
**Created**: 2026-05-22. **Owner**: AI (execute one task per `next`).
**Current cursor**: Task 13 — replace `(no data returned by API)` rows. Tasks 1–12 shipped (Task 3 fixed CSV name fallback v3.97.0; Tasks 4–6 SQLite cache via `projects-cache.ts` + wired through `projects-modal.ts`; Task 7 `projectsCacheTtlHours` setting in `settings-store`/`settings-modal`; Task 8 fetch-delay setting; Task 9 workspace header shows credits; Task 10 search input; Task 11 workspace multi-select filter v3.99.0; Task 12 credits-used min/max range filter v3.100.0). Cursor advanced 2026-06-21 at v3.100.0.
**Status**: OPEN — the only active plan left in `.lovable/plans/` after the v3.92.0 inventory correction.

## Problems reported by user
1. CSV export sometimes shows **project ID instead of project name** (some rows have name, some only ID).
2. No clickable project-name → opens in new tab from CSV (CSV side is fine; UI dialog should also support click-to-open by name — already does, but verify).
3. **No persistent cache** — every open re-fetches workspace/project/git info. Should go memory cache → SQLite, with TTL (default 1–2 days, configurable in settings).
4. **HTTP 405** on `projects.get` "git fetch" — likely the wrong endpoint. Drop or replace.
5. User wants explanation of what **"git fetch + last communication"** actually does — written into spec.
6. Dialog should show **workspace name, credits used/total** per row (currently CSV-only).
7. Dialog needs a **search bar + filter** (by project name, workspace, credits).
8. Need a **delay slider** between per-project fetches (e.g. 1–2 s) to avoid rate limits.
9. Settings panel: add per-feature TTL + inter-fetch-delay controls.
10. SQLite schema: new tables for `projects_cache` and `project_git_cache`.

## 15 Tasks (sequential — one per `next` command)

| # | Task | Outcome |
|---|------|---------|
| 1 | **Spec doc**: write `standalone-scripts/macro-controller/spec/projects-modal/00-overview.md` explaining current `git fetch + last communication` flow (calls `marco.api.projects.get`, parses `github_repo`, `github_branch`, `last_message_at`), why 405 happens, and target behavior. | User can read spec to understand. |
| 2 | **Investigate 405**: log the actual URL/method `sdk.api.projects.get` uses; document in spec; if endpoint deprecated, switch to GraphQL `getProject` or remove. | Root cause documented. |
| 3 | ✅ **Fixed project-name resolution in CSV**: when `projects.list` returns blank/id-only name, CSV falls back to the currently-open-tab project name via `GET_OPEN_LOVABLE_TABS`; id is emitted only when no human-readable name exists. `projects.get` remains removed because the route returns 405. | Shipped v3.97.0; `projects-modal-csv.test.ts` covers list-name win, open-tab fallback, and id-only fallback. |
| 4 | **SQLite tables**: create migration adding `MacroProjectCache (ProjectId, WorkspaceId, Name, GithubRepo, GithubBranch, LastMessageAt, FetchedAt, ExpiresAt)` and `MacroProjectListCache (WorkspaceId, ProjectsJson, FetchedAt, ExpiresAt)`. PascalCase per existing storage convention. | Schema ready. |
| 5 | **Cache write path**: after every successful `projects.list` + `projects.get`, upsert into SQLite with TTL. | Persisted. |
| 6 | **Cache read path**: on dialog open + before each network fetch, read from SQLite; if `ExpiresAt > now`, skip the network call. | Network reduced. |
| 7 | **TTL setting**: add `ProjectsCacheTtlHours` (default 48) to Settings → Debugging tab. Wire to cache layer. | User-tunable. |
| 8 | **Inter-fetch delay setting**: add `ProjectsFetchDelayMs` (default 1000, range 0–5000) slider to Settings. Apply between sequential `projects.get` calls in export. | Throttle UI. |
| 9 | **Show workspace + credits in dialog rows**: per workspace block, show `(used / total credits)` next to header (already shown partially — make explicit). | Visible context. |
| 10 | **Search bar in dialog**: top input filters project rows (case-insensitive substring on name + id). | Searchable. |
| 11 | ✅ **Workspace filter dropdown**: multi-select chips hide/show whole workspace blocks through `state.hiddenWorkspaces`; Clear all filters resets workspace visibility too. | Shipped v3.99.0; `projects-modal-csv.test.ts` covers workspace visibility filtering. |
| 12 | ✅ **Credits-used filter**: numeric min/max range hides workspaces whose `WorkspaceCredit.used` falls outside the inclusive range; reset by Clear all filters. | Shipped v3.100.0; `projects-modal-csv.test.ts` covers `isWorkspaceWithinCreditsRange()` (in-range, below-min, above-max, null bounds, inclusive boundaries). |
| 13 | **Replace `(no data returned by API)` rows**: if `last_message_at` missing, show "—" and don't pollute CSV. | Clean CSV. |
| 14 | **Verify SQLite end-to-end**: open dialog, close, reopen — confirm second open hits cache (zero network in DevTools). Log cache hit/miss to activity log. | Verified. |
| 15 | **Update changelog + bump version** (`constants.ts`, manifest, scripts in sync). Note all behavior changes in `changelog-modal.ts`. | ✅ Released as v3.5.1 on 2026-05-22. |

## Notes / Constraints
- Honor `mem://constraints/no-retry-policy` — single attempt per network call; delay is throttle, not retry.
- Honor `mem://constraints/no-storage-pascalcase-migration` — new tables only; do NOT rename existing `chrome.storage.local` keys.
- Honor `mem://constraints/readme-txt-prohibitions` — no time/clock content in `readme.txt`.
- Honor `mem://standards/error-logging-via-namespace-logger` — use `Logger.error()`.
- Each task ends with: build clean, no new ESLint warnings, tasks plan checkbox ticked in this file.
