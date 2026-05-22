# Question & Ambiguity Log

Active under No-Questions Mode (opened 2026-04-26). Each entry records an ambiguity, options with pros/cons, and the chosen path.

- [20 — Member-management endpoints (invite / remove / promote)](./20-member-management-endpoints.md) — Recommend Option A: assume conventional REST `/workspaces/{wsId}/memberships[/{userId}]` shape and patch on first 404.
- [50 — ProjectGroupMember.ProjectId contract (number vs UUID)](./50-project-group-member-id-contract.md) — Recommend Option C: fix the useEffect bug now, defer drag-to-assign until logs.db migration v8 normalizes ProjectId to UUID.
