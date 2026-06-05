---
name: Workspace GitHub Repo Open (right-click + cache)
description: Right-click workspace row → "Open GitHub repo" → gitsync API → SQLite cache with negative-result memoization (no retry, no refetch)
type: feature
---

# Workspace → Open GitHub Repo (v3.10.0)

**Trigger:** right-click on a workspace row in the Macro Controller
workspace dropdown → context menu entry "🐙 Open GitHub repo".
Also: "↻ Refresh gitsync" entry invalidates cache then re-runs.

**Flow:**
1. Check `WorkspaceGitsyncCache` table for (`WorkspaceId`, `ProjectId`).
2. `Status='found'` → `window.open(RepoUrl, '_blank')`.
3. `Status='not_linked'` → toast warn — **never refetch** (negative-result
   caching is mandatory per user requirement).
4. Cache miss/expired → `GET https://api.lovable.dev/workspaces/{wsId}/projects/{pid}/gitsync`,
   persist outcome, branch as above.

**No-retry contract:** single fetch per click, per
`mem://constraints/no-retry-policy`.

**Cache TTL:**
- `found` → ∞ (until user clicks "Refresh gitsync")
- `not_linked` → 24h
- `error` → 5m

**Auth:** `getBearerToken()` only (per `mem://auth/unified-auth-contract`).

**Spec:**
- `spec/22-app-issues/workspace-github-open/01-overview.md`
- `spec/22-app-issues/workspace-github-open/02-api-sample.md` (verbatim
  request + response samples preserved per user instruction)

**Plan:** `.lovable/plans/v3-10-0-refill-priority-and-github-open.md`
