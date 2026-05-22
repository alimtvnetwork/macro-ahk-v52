# Q52 — Projects modal: how to resolve HTTP 405 on `GET /projects/{projectId}`

**Context**: macro-controller Projects modal → Export CSV. The per-project enrichment pass calls `marco.api.projects.get(projectId)` which is registered as `GET /projects/{projectId}` in `standalone-scripts/marco-sdk/src/api-registry.ts:165`. The server returns **HTTP 405 Method Not Allowed**, so `gitRepo` / `gitBranch` / `lastCommunication` columns end up empty and the activity log fills with errors.

**Sibling routes that DO work** (same `apiRegistry.projects`-ish surface):

- `POST /projects/{projectId}/move-to-workspace`
- `POST /projects/{projectId}/mark-viewed`
- `GET  /projects/{projectId}/workspace`
- `POST /projects/{projectId}/remix/init`
- `GET  /workspaces/{wsId}/projects?limit=200` ← currently used by `projects.list`

405 on the bare `GET /projects/{projectId}` strongly suggests the server reserves the bare resource for non-GET verbs (typically `DELETE` or `PATCH`) and exposes read access only through the list endpoint or sub-paths.

## Options

### A. Drop `projects.get`; enrich CSV rows from `projects.list` response. ← **Recommended**

- **Why**: `projects.list` already returns rich objects (`{ id, name, ... }`). The Lovable dashboard's own project picker shows repo/branch/last-activity from the list payload, so the same fields almost certainly arrive there. We just aren't reading them.
- **Pros**: zero new network calls; CSV export goes from N+1 to 1 request per workspace; throttle setting (Step 8) becomes optional; no 405 errors in activity log; fewer moving parts.
- **Cons**: if the list response omits some git fields, CSV columns stay blank for those projects (but they're blank today anyway). If a future need requires per-project deep metadata, we'll have to revisit.
- **Action**:
  1. Capture one real `projects.list` response (Chrome DevTools → Network → `/workspaces/{wsId}/projects?limit=200`) and confirm field names.
  2. Extend `ProjectEntry` to carry `githubRepo`, `githubBranch`, `lastMessageAt`.
  3. Delete `apiRegistry.projects.get` + `api.projects.get` + `fetchProjectGitInfo()`.
  4. CSV `gitRepo`/`gitBranch`/`lastCommunication` columns sourced directly from the cached `ProjectEntry`.

### B. Switch `projects.get` to a working endpoint (e.g. `POST /api/trpc/project.getById`).

- **Pros**: per-project authoritative data.
- **Cons**: requires reverse-engineering the lovable.dev tRPC schema; tRPC URLs/payloads change across releases; doubles network traffic; needs Step 8 throttle to avoid bursts.

### C. Issue request from the page context with the page's cookies.

- **Pros**: most reliable for endpoints that gate by session cookie.
- **Cons**: same brittleness as B plus cross-context plumbing.

## Decision (2026-05-22)

Going with **Option A**. Step 3 of the 15-step plan will:

- Confirm `projects.list` response shape by inspecting one live call.
- If the expected fields are present, drop `projects.get` and populate CSV from the list response.
- If a field is missing in some rows, leave the column blank and emit a single info-level note (not an error) per missing field.

Re-open this Q only if Option A proves the list response truly lacks `github_repo` / `github_branch` / `last_message_at` for active projects.
