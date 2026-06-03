# Question & Ambiguity Log

Active under No-Questions Mode (opened 2026-04-26). Each entry records an ambiguity, options with pros/cons, and the chosen path.

- [20 — Member-management endpoints (invite / remove / promote)](./20-member-management-endpoints.md) — Recommend Option A: assume conventional REST `/workspaces/{wsId}/memberships[/{userId}]` shape and patch on first 404.
- [50 — ProjectGroupMember.ProjectId contract (number vs UUID)](./50-project-group-member-id-contract.md) — Recommend Option C: fix the useEffect bug now, defer drag-to-assign until logs.db migration v8 normalizes ProjectId to UUID.
- [51 — Bulk Remix Next: target scope](./51-bulk-remix-next-scope.md) — Recommend Option A: iterate checked workspace rows (rename feature to "Bulk Remix Next across checked workspaces"); deferred this loop.
- [52 — Projects modal: HTTP 405 on `GET /projects/{projectId}`](./52-projects-get-405.md) — Recommend Option A: drop `projects.get`, enrich CSV rows from `projects.list` response (eliminates 405, removes N extra HTTP calls per export).
- [53 — HEFF: script-resolver candidate fallback on HTTP failure](./53-heff-script-resolver-network-vs-http.md) — Recommend Option C: network errors → try next candidate; HTTP 4xx/5xx → stop the resolver (HEFF-compliant fallback).
- [54 Logo prompt numbering](./54-logo-prompt-numbering.md) — chose slot 06 over user-suggested 02 (slot taken); reversible via git mv
- [57 — pro_1 Credit Totals formula](./57-pro-one-credit-totals-formula.md) — Recommend Option A: billing-period fields only (matches spec/21-app/03-data-and-api/api-response/04-plan.md and the website's UI); implemented v3.32.0.
- [124 — Loop play/pause + locked-banner XPaths](./124-loop-play-pause-xpaths.md) — Recommend Option A: ship spec only; wait for user-supplied PLAY_BUTTON_XPATH / PAUSE_BUTTON_XPATH / LOCKED_BANNER_XPATH before Tasks 2-5.
- [125 — Screenshot supplied without a requested change](./125-screenshot-without-request.md) — Recommend Option A: treat image as reference only and avoid code changes until the exact issue is named.
- [58 — 2026 Spec — scope & placeholders](./58-2026-spec-scope-placeholders.md) — Created `spec/2026-spec/` (now `spec/01-prompt-spec-2026/`) with 00-overview + 01-plan-tasks-1-20; all host XPaths left as `???`; cadence: 10 spec tasks per `next ten steps` turn (10 turns to cover T21–T120).
- [59 — 2026-spec folder name finalization](./59-2026-spec-folder-name.md) — Finalized the requested folder name: completed spec NOW lives at `spec/01-prompt-spec-2026/` (renumbered 2026-06-03; PoC dir was never created — N/A), and scripts/docs point there.
