# 50 — ProjectGroupMember.ProjectId number vs StoredProject.id UUID

## Context
Cross-Project Sync Phase 3 wants drag-to-assign projects → groups and a project-picker UX. But there's a contract mismatch:

- `library-handler.ts` defines `ProjectGroupMember.ProjectId: number` (INTEGER column in SQLite `logs.db`).
- `hooks/use-projects-scripts.ts` defines `StoredProject.id: string` (UUID stored in `chrome.storage.local`).

The existing "Add Member" input accepts a raw integer, so today the table stores numbers that never resolve to any real project. Drag-and-drop or a picker would require either (a) reconciling the two ID spaces, or (b) coercing UUID→hash→int.

## Options

### A. Coerce UUID → stable 32-bit hash (lossy, no migration)
- **Pros:** No schema change, no breaking message types, drag-and-drop ships immediately.
- **Cons:** Collisions theoretically possible (~1 in 4B); can't round-trip back to UUID without a lookup map; reads from older numeric data become orphaned.

### B. Migrate column `ProjectId INTEGER` → `ProjectIdUuid TEXT` (proper fix)
- **Pros:** Single source of truth; references real projects.
- **Cons:** Migration v8 of `logs.db`; updates 6 handler queries, message types, `LIBRARY_ADD_GROUP_MEMBER`/`REMOVE`/`GET_MEMBERS`/cascade flow; touches `ProjectGroupPanel` + tests. ~2 hr work.

### C. Defer drag-to-assign; ship the smaller Phase 3 wins now (useEffect bug fix, project-picker dropdown gated behind contract reconciliation)
- **Pros:** No-Retry/No-Risk: lands today's safe fixes without inventing data-shape decisions.
- **Cons:** Phase 3 "drag-to-assign" remains open until B is scheduled.

## Recommendation
**Option C** for this loop. Fix the real `useState`→`useEffect` bug in `ProjectGroupPanel.GroupDetailPanel` (member list doesn't refresh on group change), and surface this contract mismatch via an inline TODO + this log entry. Then schedule Option B (`logs.db` migration v8) as its own work-item next session — too large for a "next" sweep and needs migration discussion.

Drag-and-drop is intentionally NOT implemented in this loop because every interaction would write a fabricated numeric ID into `ProjectGroupMember.ProjectId`, making the data unrecoverable after Option B lands.
