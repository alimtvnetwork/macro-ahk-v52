# 30 — Next Task (v3.93.0)

## Root cause analysis

Plan `.lovable/plans/projects-modal-15-step-improvement.md` had its cursor stuck at Task 1, but inspection showed Tasks 1 and 2 were already shipped:
- Task 1 spec exists at `standalone-scripts/macro-controller/spec/projects-modal/00-overview.md` (105 lines).
- Task 2 (`projects.get` 405) is resolved per Q52 — `projects-modal.ts:728-735` documents the removal of the per-project call.

## Action taken

- Advanced cursor in plan to Task 3 (CSV project-name resolution fallback chain) and recorded that Tasks 1–2 shipped.
- Bumped version 3.92.0 → 3.93.0 across `manifest.json`, `version.json`, `src/shared/constants.ts`, 8 `instruction.ts` files, `macro-controller/shared-state.ts`, `payment-banner-hider/index.ts`, and `readme.md`.
- Updated `changelog.md` + `RELEASE_NOTES.md`.
- `node scripts/check-version-sync.mjs` → ✅ all in sync.

## Next 3 steps

1. **Task 3 — CSV project-name fallback** (~45 min). Why now: top user complaint (CSV rows showing project ID instead of name). Unblocks: clean CSV export usable downstream.
2. **Task 4 — SQLite cache tables** (~1 h). Why now: every later cache task depends on this schema. Unblocks: Tasks 5–7 (write/read/TTL).
3. **Task 8 — Inter-fetch delay slider** (~30 min). Why now: low risk, isolated UI setting; protects API while cache work continues. Unblocks: safer bulk exports.

## Every remaining item

Tasks 3–15 of `projects-modal-15-step-improvement.md`; Issue 113 (tooltip/members popup); Issue 111 (Lovable tabs mapping); 8 idle-loop performance audit items per `mem://performance/idle-loop-audit-2026-04-25` (PERF-1 critical: hot-reload runs in prod).
