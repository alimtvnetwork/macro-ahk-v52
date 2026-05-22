# Projects Modal — Overview Spec

**Module**: `standalone-scripts/macro-controller/src/ui/projects-modal.ts`
**SDK**: `standalone-scripts/marco-sdk/src/api-registry.ts` (`apiRegistry.projects`)
**Status**: Step 1 of 15 — see `.lovable/plans/projects-modal-15-step-improvement.md`

## 1. What the dialog does

When the user opens the Projects panel from the macro-controller menu, the modal:

1. Snapshots the in-memory list of workspaces (`loopCreditState.perWorkspace`).
2. Asks the background service worker which Lovable project tabs are currently open in Chrome (`GET_OPEN_LOVABLE_TABS`).
3. For each workspace, calls `marco.api.projects.list(wsId)` → expects `{ projects: [{ id, name, … }] }`.
4. Renders one section per workspace: green ● = open tab, ○ = closed. Click any row → opens that project in a new tab.

## 2. What "git fetch + last communication" does (CSV export)

The footer **Export CSV** button performs a *second*, per-project pass:

- For every project across every workspace, it calls `marco.api.projects.get(projectId)` (registered as `GET /projects/{projectId}`).
- It parses the response for:
  - `github_repo` (or `githubRepo` / `github_full_name` / `repo_full_name`) → CSV column **gitRepo**
  - `github_branch` (or `githubBranch` / `default_branch` / `branch`) → **gitBranch**
  - `last_message_at` (or `lastMessageAt` / `updated_at` / `updatedAt`) → **lastCommunication**
- Calls run sequentially (no parallelism) to respect `mem://constraints/no-retry-policy` and avoid bursting the API.
- Each failure is captured in the row's **gitFetchError** column; the export still completes.

"Last communication" = the most-recent activity timestamp the server reports for that project (typically the timestamp of the latest AI message or update). It is NOT a git operation despite the button label.

## 3. The HTTP 405 problem

User reports `GET /projects/{projectId}` returns **HTTP 405 Method Not Allowed**.

**Diagnosis**: the route `/projects/{projectId}` is not exposed on the public REST API surface used by `CREDIT_API_BASE`. Project metadata is fetched through a different channel on lovable.dev (likely a tRPC / GraphQL POST endpoint embedded in the web app, not a public REST GET).

**Options** (to be confirmed in Step 2 by inspecting the live request):

| Option | Action | Trade-off |
|---|---|---|
| A. Drop `projects.get` entirely | Use only `projects.list` data (id + name + whatever list returns); leave `gitRepo`/`gitBranch`/`lastCommunication` columns blank | Simplest. CSV loses git columns. |
| B. Switch to the page-context fetch | Issue the request from the page's own session (DOM-injected fetch with the page's auth cookie) | More reliable on lovable.dev; risk of breakage if path changes. |
| C. Inspect & switch endpoint | Capture the actual URL the lovable.dev dashboard uses (likely `POST /api/trpc/project.getById` or similar), update `apiRegistry.projects.get` | Best fidelity. Requires Step 2 network capture. |

**Provisional recommendation**: Option C, falling back to A if no endpoint can be confirmed.

## 4. Why some CSV rows show ID instead of name

`projects.list` is expected to return `name` for every project, but some workspaces return entries with empty `name`. The current code falls back to `id` when `name` is blank:

```ts
if (id) out.push({ id, name: name || id });
```

This is why some rows display the UUID. Step 3 will add a multi-source fallback:
1. `projects.list` → `name`
2. Currently-open-tab title (already known via `GET_OPEN_LOVABLE_TABS`)
3. SQLite cache (`MacroProjectCache.Name` from a previous successful fetch)
4. `projects.get` response (once Step 2 confirms a working endpoint)

## 5. Cache plan (Steps 4–7)

Two new SQLite tables (PascalCase per `mem://architecture/logging-data-contract`):

```
MacroProjectListCache (
  WorkspaceId    TEXT PRIMARY KEY,
  ProjectsJson   TEXT NOT NULL,    -- serialized [{Id, Name}, …]
  FetchedAt      INTEGER NOT NULL, -- ms epoch (UTC)
  ExpiresAt      INTEGER NOT NULL
)

MacroProjectCache (
  ProjectId      TEXT PRIMARY KEY,
  WorkspaceId    TEXT,
  Name           TEXT,
  GithubRepo     TEXT,
  GithubBranch   TEXT,
  LastMessageAt  TEXT,             -- ISO string as returned by server
  FetchedAt      INTEGER NOT NULL,
  ExpiresAt      INTEGER NOT NULL
)
```

TTL: default **48 hours**, user-configurable via Settings → Debugging (`ProjectsCacheTtlHours`, Step 7).

Read path: on dialog open, hydrate from cache first; only network-fetch entries where `ExpiresAt <= now`.
Write path: every successful `projects.list` or `projects.get` upserts. Logged via `RiseupAsiaMacroExt.Logger.info()` with cache hit/miss markers.

## 6. Throttle plan (Step 8)

Add `ProjectsFetchDelayMs` setting (default **1000ms**, range **0–5000ms**), applied as `await sleep(delay)` between successive `projects.get` calls during CSV export. This is a throttle, not a retry — single attempt per project is preserved.

## 7. Dialog UX additions (Steps 9–13)

- Per-workspace header: show `name · creditsUsed / creditsTotal` (data already in `loopCreditState`).
- Search bar: top of dialog, case-insensitive substring filter across project `name` and `id`.
- Workspace multi-select chips: hide/show whole workspace blocks.
- Credits range filter: numeric min/max to hide workspaces outside range.
- Replace placeholder `(no data returned by API)` with `—`.

## 8. References

- `mem://constraints/no-retry-policy` — single attempt per HTTP call
- `mem://constraints/no-storage-pascalcase-migration` — new tables only; do not rename existing chrome.storage.local keys
- `mem://architecture/data-storage-layers` — SQLite is the persistence layer for cached server data
- `mem://standards/error-logging-via-namespace-logger` — `Logger.error()`, no swallowed errors
- `mem://injection-context-awareness` — macro-controller runs in MAIN world, cannot call `chrome.tabs` directly
