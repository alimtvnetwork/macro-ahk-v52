# Issue 129 — Prompts cache, Plan Task, GitSync (connect/disconnect), Remix nav, Project-name dropdown, Typography & badge polish

**Status:** Planning (no implementation yet)
**Reported:** 2026-05-30
**Severity:** P1 — direct user-visible UX defects on hot paths.

## Symptoms

### S-1. Plan/Next buttons missing after prompt click (no cache hit)
When the user clicks a prompt in the prompts dropdown, the action row
containing **Plan Task** and **Task Next** does not render instantly. The
user briefly sees no buttons (or a flicker / spinner). Expectation: the
buttons are part of the cached prompt detail and MUST appear synchronously
from the in-memory snapshot — zero loading state, zero round-trip.

### S-2. Plan Task button is a no-op
Clicking **Plan Task** does nothing. **Task Next** is wired correctly.
Likely cause candidates (to verify, not assume):
- Handler bound to wrong element / wrong `data-action` key.
- Composer text not staged because Plan handler skips the
  "wrap with `Plan it:` prefix" path used by Task Next.
- Async path swallows the error silently (audit will tell us which).

### S-3. GitSync connection detection is missing / unreliable
Right-click → "Open GitHub Repo" only knows about connections that
`/projects` returned. There is no first-class probe of the GitSync
job-progress endpoint. We must:
- Detect "is this project already connected to a GitHub repo?" via the
  GitSync **progress** endpoint, NOT by re-POSTing `/sync` (which would
  create a repo when none exists).
- Only POST `/sync` when the project is confirmed NOT connected.

### S-4. Remix flow does not navigate to the new project
`POST /remix` (or equivalent) successfully creates the new project, but
the active tab is not redirected to the new project URL. The user is left
on the old project. Macro-controller is therefore not re-injected on the
new project either.

---

## API contracts (from the user's curl capture)

### Create / trigger sync
```
POST https://api.lovable.dev/workspaces/{wsId}/connections/gitsync/{connId}/projects/{projectId}/sync
→ { "job_id": "gitsync-sync-project-{projectId}" }
```
- **Creates the GitHub repo only if the project is not already connected.**
- Idempotent on the project side: a re-POST when already connected will
  still return a `job_id` whose progress immediately resolves with the
  existing `result.repo_url`. We must NEVER rely on this — always probe
  progress FIRST.

### Read progress
```
GET https://api.lovable.dev/workspaces/{wsId}/connections/gitsync/projects/{projectId}/jobs/{jobId}/progress
```
Two response shapes:
```jsonc
// In flight
{ "type":"sync", "status":"running", "step":"pushing_code",
  "title":"Syncing '<name>' with GitHub", "description":"Pushing code to GitHub..." }
// Completed
{ "type":"sync", "status":"completed",
  "title":"'<name>' synced",
  "description":"https://github.com/<owner>/<repo>",
  "result": { "repo_url":"https://github.com/<owner>/<repo>",
              "repo_name":"<repo>", "owner":"<owner>" } }
```

### Connection-detection rule (canonical)
```
isConnected(project) :=
  exists a completed progress response with result.repo_url set
  for some prior job_id of this project.
```
Implementation: probe `progress` for the well-known job id
`gitsync-sync-project-{projectId}`. If `status===completed && result?.repo_url` → connected.
If 404 / no such job / running → poll up to N seconds (sequential, single
deadline — honors `mem://constraints/no-retry-policy`). If still no
`repo_url` after the deadline → treat as not connected.

---

## Ten-step fix plan

> Each `next` command executes ONE step. Sequential, fail-fast, no retries.

### Step 1 — Spec authoring & plan.md sync (this file)
Land this spec + a mirror entry in `.lovable/plan.md`. No code yet.

### Step 2 — Prompts cache snapshot guarantees Plan/Task-Next buttons
- Audit `panel-controls.ts` → `renderPromptsDropdown` and the prompt-click
  handler. Verify the HtmlCopy snapshot already includes the action row.
- If snapshot is missing the row, extend the cache shape so the row is
  baked in at save-time, not appended on click.
- Render path must be 100% synchronous from `IndexedDB.HtmlCopy` — no
  `await`, no network, no `requestAnimationFrame` gate before the buttons
  appear. Loading state is permitted ONLY on cold-cache first-ever load.
- Unit test: prompt click renders the action row in the same tick.

### Step 3 — Diagnose & fix Plan Task button
- Add temporary diagnostic logging in the dropdown click delegator to
  capture: matched `data-action`, target element, handler resolution.
- Compare Plan-handler vs Task-Next-handler code paths line by line.
- Fix the divergence (likely the composer-fill path or the missing
  `data-action="plan"` attr in the cached HTML).
- Unit test: `plan` action stages the composer with the documented
  prefix; `task-next` continues to work unchanged.

### Step 4 — GitSync progress-probe module
- New module `standalone-scripts/macro-controller/src/gitsync/progress-probe.ts`.
- Exports:
  - `probeProgress(wsId, projectId, jobId, deadlineMs)` → resolved
    progress JSON or `null`.
  - `resolveConnection(wsId, connId, projectId)` →
    `{ connected: true, repoUrl, repoName, owner } | { connected: false }`.
- Uses single `getBearerToken()` call. Sequential polling within a single
  deadline; no exponential backoff; cancels on first terminal state.
- Negative results cached (per `mem://features/workspace-github-repo-open`).

### Step 5 — Hook progress-probe into the right-click "Open GitHub Repo" path
- Replace any direct `/projects` lookup with `resolveConnection()`.
- Menu item label states:
  - "Open GitHub Repo" when connected (opens `repoUrl`).
  - "Connect to GitHub" when not connected (triggers Step 6 flow).
  - "Syncing…" while a probe is running (disabled).

### Step 6 — Connect flow: POST /sync only when not connected
- New helper `ensureGithubRepo(wsId, connId, projectId)`:
  1. `resolveConnection()` — if connected, return repoUrl.
  2. Else `POST .../sync` → get `job_id`.
  3. Poll `progress` until `status==='completed'` or deadline.
  4. Return `result.repo_url`, persist to SQLite cache.
- No silent retry on failure — surface error via `Logger.error()` per
  Code-Red Logging core rule (exact path, missing item, reason).

### Step 7 — Remix flow: capture new project URL
- Locate the remix trigger in macro-controller (likely `ws-context-menu.ts`
  or a panel button). Audit the network call to confirm response shape
  (`{ project_id, project_url, … }` — to be captured in the spec when
  observed).
- After successful remix, persist the new project_id to the per-tab
  workspace-mapping cache so the auto-injector picks it up.

### Step 8 — Remix flow: navigate active tab to the new project
- `window.location.assign(newProjectUrl)` in the MAIN-world responder, OR
  `chrome.tabs.update(tabId, { url: newProjectUrl })` from background —
  whichever the platform-adapter pattern requires.
- New-tab guard (`isNewTabOrBlankUrl()`) must not be bypassed: the
  destination URL is always a real lovable project URL.

### Step 9 — Remix flow: auto-reinject macro-controller on the new project
- After navigation, the existing auto-injector + project-matcher should
  fire on the new URL. Verify the per-tab cache invalidation triggers
  re-injection (don't rely on stale "already-injected" sentinel for the
  old project_id).
- If a gap exists, emit `RECHECK_INJECTION` on `webNavigation.onCommitted`
  when the URL transitions between two lovable project IDs in the same tab.

### Step 10 — GitSync disconnect (DELETE /sync)
- API contract (from user capture):
  ```
  DELETE https://api.lovable.dev/workspaces/{wsId}/connections/gitsync/{connId}/projects/{projectId}/sync
  → 200/204 (body empty)
  ```
  Disconnects the GitHub repo from the project. Repo on GitHub remains.
- Add `disconnectGithubRepo(wsId, connId, projectId)` to the gitsync module
  (single `getBearerToken()`, no retry, surface failures via `Logger.error()`
  with exact endpoint URL + reason).
- Invalidate the per-project SQLite cache row on success so the next probe
  reflects "not connected".
- Confirm dialog before invoking (irreversible action, even though the
  GitHub repo itself survives).
- Unit test: success path clears cache; failure path keeps cache and logs.

### Step 11 — Project-name dropdown menu (workspace toolbar)
- Add a chevron / "▾" affordance beside the project name in the workspace
  toolbar (same row that currently holds the Remix button).
- Dropdown items:
  1. **Rename project** — opens existing rename dialog.
  2. **Connect to GitHub** — visible only when `resolveConnection()` says
     not connected (calls Step 6 `ensureGithubRepo`).
  3. **Open GitHub repo** — visible only when connected (opens `repoUrl`).
  4. **Disconnect GitHub** — visible only when connected (calls Step 10).
  5. **Git status** — opens a lightweight panel: shows last sync state from
     `progress` (`status`, `step`, `title`, `description`, `result.repo_url`).
  6. **Remix** — keeps the existing top-level Remix button AS-IS; the menu
     item is a duplicate convenience entry.
- Dropdown uses the dark-theme tokens and existing menu-builder pattern
  (`mem://features/macro-controller/workspace-tooltip-members-popup` for
  popup conventions; do NOT re-introduce a native `title=` tooltip).
- The dropdown trigger is keyboard-accessible (`Enter`/`Space` opens it,
  `Esc` closes, arrow keys navigate).
- Unit test: menu items show/hide correctly based on connection state.

### Step 12 — Typography bump: project name + workspace name
- Project name (workspace toolbar): increase from current `13px/14px` to
  ~`16px`, weight `600`, line-height tightened so the row height does not
  grow more than 2px.
- Workspace name (ws-list rows): increase from current `12px/13px` to
  ~`14px`, weight `500`. Keep the "Pro" pill exactly as it is — user
  explicitly likes the current Pro label rendering.
- All changes via existing CSS tokens / module styles only — no new
  Tailwind utilities in the standalone bundle.
- Visual regression: capture before/after screenshots, attach to spec.

### Step 13 — Fix Expire pill colour contract
- Current: Expire label renders with the wrong palette (some neutral
  variant or partial badge tone).
- Required: **red background, white text** for the Expire / Expired state.
  Use the existing `--mc-status-danger` token (or equivalent dark-theme
  red) for bg and `#ffffff` for text.
- Cancel state remains muted gray (per
  `mem://features/macro-controller/workspace-badge-display` — must not
  regress to red).
- Unit test: `resolveStatusTone('expire')` → `{ bg: red, fg: white }`.

### Step 14 — Fix "Passed Nd" past-due UI
- Per `.lovable/question-and-ambiguity/118-past-due-expire-countdown.md`,
  the pill uses `Today` / `Passed 1d` / `Passed Nd` semantics with a
  5d/10d tone ramp. The current rendering looks visually broken (clipped
  text, wrong border, mis-aligned dot, or overflow into the row).
- Audit `ws-list-renderer.ts` + `ws-status-pill.ts` for the past-due
  branch. Fix any of: padding, border-radius, vertical alignment with
  sibling tier badge, max-width truncation, dot indicator alignment.
- Acceptance: pill renders cleanly at 12px font, 4px vertical padding,
  flush-aligned with the Pro/Tier pill on the same row, and the tone
  ramp (`<5d` muted → `5–10d` amber → `>10d` red) is visible.
- Visual regression screenshots required.

### Step 15 — Version bump + changelog + readme + tests green
- MINOR bump per `mem://prompts/08-bump-version` (all unified-version sites:
  `manifest.json`, `version.json`, `src/shared/constants.ts`,
  `shared-state.ts`, every `standalone-scripts/*/src/instruction.ts`).
- Root `changelog.md` entry grouped (Added / Changed / Fixed / Removed).
- Pin new version in root `readme.md` (badge + install snippet).
- `bunx vitest run` green for tests added in steps 2/3/4/6/9/10/11/13.
- `bunx tsc --noEmit` green.
- `node scripts/check-version-sync.mjs` exits 0.
- `.gitmap/release/v<new>.json` + `latest.json` written.


---

## Out of scope
- Changing the wording on Plan Task / Task Next buttons.
- Changing remix server behavior (we only fix the client navigation).
- New retry/backoff loops (banned).

## Memory ties
- `mem://constraints/no-retry-policy` — sequential fail-fast.
- `mem://features/workspace-github-repo-open` — negative result caching.
- `mem://features/macro-controller/open-tabs-workspace-mapping` — per-tab
  workspace cache that Step 7/9 piggyback on.
- `mem://features/prompt-management` — dual-cache (JsonCopy/HtmlCopy)
  that Step 2 makes synchronous.
- Core rule "New-tab guard" — Step 8 must not regress it.
