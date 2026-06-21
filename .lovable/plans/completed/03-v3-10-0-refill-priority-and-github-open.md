> **STATUS:** ✅ COMPLETED — archived 2026-06-21 (v3.91.0 plan-inventory sweep). All steps shipped; see changelog + memory references.

# Plan — Refill Priority Filter + Button Overflow Fix + GitHub Open (v3.10.0)

**Workstream:** ships as **minor bump v3.9.3 → v3.10.0**.
**Specs:**
- `spec/22-app-issues/refill-priority-filter/01-overview.md`
- `spec/22-app-issues/workspace-github-open/01-overview.md`
- `spec/22-app-issues/workspace-github-open/02-api-sample.md`

## 10-Step Plan

### Step 1 — Button row overflow fix
- File: `standalone-scripts/macro-controller/src/ui/panel-controls.ts`
- Add `min-width:0;max-width:100%;overflow:visible` to `btnRow` cssText.
- Add `min-width:0` to `startStopWrap`, `promptsContainer`, `menuContainer`.
- Verify in panel at widths 320 / 380 / 460 / 600 px.

### Step 2 — `REFILL_PRIORITY_WINDOW_DAYS` constant + score helper
- Add constant to `standalone-scripts/macro-controller/src/constants.ts`
  (default `10`).
- New file `src/workspace-refill-priority.ts` exporting
  `computeRefillScore(ws, K)` and `sortByRefillPriority(list, K)` pure
  functions. Includes vitest covering: positive urgency, past-refill clamp,
  missing date sentinel, tie-breakers.

### Step 3 — Wire `Refill priority` row into filter popover
- File: `ws-filter-menu.ts` — add new `FilterRowConfig` with id
  `loop-ws-refill-priority-filter`. Plumb getter/setter through deps.
- File: `ws-selection-ui.ts` (or whichever holds filter flags) — add
  `loopWsRefillPriorityOn` boolean state + persistence in
  `chrome.storage.local`.

### Step 4 — Apply sort in `ws-list-renderer.ts`
- After existing filters are applied, if `refillPriorityOn` is true call
  `sortByRefillPriority(filteredList, REFILL_PRIORITY_WINDOW_DAYS)` before
  rendering. Compose with `Focus current` (focus stays pinned at top).

### Step 5 — Inline `R Nd` badge on workspace row
- File: `ws-list-renderer.ts` — render a `<span class="loop-ws-refill-badge">`
  next to `.loop-ws-name` when `daysToRefill` is between 0 and
  `REFILL_PRIORITY_WINDOW_DAYS` inclusive. Color tiers per spec §4.
- Snapshot test ensures the badge text format `R Nd`.

### Step 6 — `WorkspaceGitsyncCache` SQLite table + migration
- New file `src/db/migrations/20260524-gitsync-cache.ts` (PascalCase
  columns per memory `mem://constraints/no-storage-pascalcase-migration`).
- New file `src/gitsync-cache.ts` exposing:
  - `getGitsyncCache(wsId, pid)` → returns row or null (TTL-aware; expired
    rows return null and are deleted lazily).
  - `setGitsyncCache(wsId, pid, status, config?)`.
  - `invalidateGitsyncCache(wsId, pid)`.

### Step 7 — `fetchGitsyncConfig` (network)
- New file `src/gitsync-api.ts` — `fetchGitsyncConfig(wsId, pid)`:
  - Reads bearer via `getBearerToken()` (memory `mem://auth/unified-auth-contract`).
  - `GET https://api.lovable.dev/workspaces/{wsId}/projects/{pid}/gitsync`.
  - Returns `{ status: 'found'|'not_linked'|'error', config? }`.
  - Single attempt, no retry / backoff (memory `mem://constraints/no-retry-policy`).
  - Failure logs via `Logger.error()` with full path + payload snippet.

### Step 8 — Right-click "Open GitHub repo" + "Refresh gitsync"
- File: `ws-context-menu.ts` — append two menu entries.
- Handler (`openGithubRepoFlow`):
  1. `cached = getGitsyncCache(wsId, pid)`
  2. If `cached?.Status === 'found'` → `window.open(cached.RepoUrl, '_blank')`.
  3. If `cached?.Status === 'not_linked'` → toast warn.
  4. Else `fetchGitsyncConfig` → `setGitsyncCache` → branch as above.
- `Refresh gitsync` handler → `invalidateGitsyncCache` then run handler.

### Step 9 — Tests + lint clean
- `bunx vitest run` (new refill-priority + gitsync-cache TTL tests).
- `bunx tsc --noEmit`.
- Visual sanity of button row at multiple widths (manual policy — log
  only, no Chrome automation per `mem://preferences/deferred-workstreams`).

### Step 10 — Version bump → v3.10.0 + changelog + README pin
- `sed` bump `3.9.3` → `3.10.0` across manifest, constants, all 7
  `instruction.ts`, `macro-controller/shared-state.ts`, readme, changelog
  (per memory `mem://workflow/versioning-policy`).
- Changelog entry under `## [v3.10.0]` listing: button overflow fix,
  refill priority filter + `R Nd` badge, GitHub repo open + cache.
- **Pin v3.10.0 in root `readme.md`** badges / version line (per user
  instruction this turn).
- `node scripts/check-version-sync.mjs` must pass.

---

## Tracking

- Each step marked done in this file as it ships.
- Suggestions / ambiguities → `.lovable/question-and-ambiguity/`
  (no-questions mode active per memory `mem://workflow/no-questions-mode`).
- This plan is the authoritative roadmap per memory
  `mem://workflow/planning-roadmap`.
