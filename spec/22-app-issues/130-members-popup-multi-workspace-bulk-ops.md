# Issue 130 — Members Popup: Multi-Workspace Bulk Operations + Inline Promote

**Status:** Spec (Step 1) — implementation pending.
**Reported:** 2026-05-30 (user) — *"There is a serious bug on add/show member button. It shows like a tooltip, but it should display like a rename box where all kinds of options should be there."*
**Owner module:** `standalone-scripts/macro-controller/src/ws-members-panel.ts` + `ws-members-mutations.ts` + `ws-context-menu.ts`.

---

## 1. Symptoms (current behavior, v3.41.0)

1. **Single-workspace only.** Right-click → `👥 Show Members` opens a panel scoped to ONE `wsId`. No way to operate across the selected/visible set.
2. **No multi-email invite.** `inviteMember()` accepts a single `email` string; the popup's `Add` row is a single `<input type="email">` + `<select>`.
3. **No workspace multi-select primitive** anywhere in `ws-list-renderer.ts` — there is no checkbox column, no `Shift+click` range, no `Ctrl+click` toggle, and no `selectedWsIds` store.
4. **Promote/demote requires the panel.** `updateMemberRole()` is only wired through the row's `⋯` menu inside the Members panel. You cannot promote/demote from the workspace-row right-click menu directly.
5. **No "common members" view.** When operating across many workspaces, the user has no aggregated view of who is in ALL of them vs SOME of them.

The user calls this a "serious bug" because the Members button visually looks like an action surface but lacks the bulk-ops affordances they expect.

---

## 2. Requirements (verbatim, distilled from voice transcript)

R1. **Multi-email add** — paste/type *multiple* email addresses into the Add row and invite them in one submit.
R2. **Multi-workspace select** — select multiple workspaces in the list, right-click, and the context menu's `Show Members` opens a **bulk** members popup.
R3. **Common-members surface** — the bulk popup must clearly mark which members are in ALL selected workspaces vs only SOME (and how many).
R4. **Bulk add** — adding a member from the bulk popup applies the invite to ALL selected workspaces.
R5. **Bulk promote / make owner** — promote (or demote) a member's role across all selected workspaces in one click. Should also be reachable from the **row right-click menu** (per user: *"directly by right-clicking"*).
R6. Existing single-workspace flow (R1-…-only path) must keep working unchanged for users who right-click ONE row.

---

## 3. Options & trade-offs

### 3a. Multi-workspace selection model

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | **Checkbox column** prepended to each `ws-row`, plus `Shift+click` range + `Ctrl/Cmd+click` toggle on the row body. Selection persists in a `selected-workspaces-store.ts` pub/sub (mirroring `visible-workspaces-store.ts`). | Discoverable. Survives filter changes. Composes with existing summary-bar pattern. Right-click on any selected row gets a "Bulk: N selected" submenu. | New column = ~20px width; needs row-renderer change + selection-aware context menu. |
| B | `Ctrl/Cmd+click` only (no checkbox). Selection vanishes on filter/refresh. | Zero visual surface. | Invisible state — users won't know they have anything selected. Fails R3 discoverability. |
| C | Modal "pick workspaces" launched from a single workspace's menu. | No row changes. | Two-step flow; doesn't match user's mental model ("select then right-click"). |

**Recommendation: A.** It matches R2 verbatim and reuses the `pub/sub` pattern already adopted by `visible-workspaces-store.ts` (per `mem://features/macro-controller/...`). The new column hides when the panel width is below a threshold to keep the dense layout intact.

### 3b. Multi-email input UX (R1)

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | **Chip input**: textarea-like field that converts each comma/space/newline-separated token into a removable email chip. Inline RFC-5322 validation per chip; submit disabled until all chips valid. | Familiar (Gmail, Slack, Linear). Per-chip error state. Easy to paste a list. | ~120 LOC of chip-input UI + tests. |
| B | Plain `<textarea>`, one email per line, parsed on submit. | Trivial to build. | No per-email feedback; one bad email rejects the whole batch unless we add post-parse error rendering anyway. |
| C | Multi-line + "Validate" button before "Invite". | Explicit. | Extra click. |

**Recommendation: A.** The chip pattern is the industry standard for this exact problem and matches the user's "add multiple email addresses" framing. Reuses no external lib — pure DOM (~120 LOC).

### 3c. Common-members aggregation (R3, R4)

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | **Tri-state badges**: `ALL N` (green, in every selected ws), `SOME k/N` (amber, in some), `NONE` is hidden. Row sort: ALL first, then SOME desc, then alpha. | Direct mapping of user's requirement. Single fetch per ws (cached). | Need to fetch members for every selected ws on open — capped at e.g. 25 workspaces with a `⚠ N skipped` notice if exceeded. |
| B | Show only ALL-members; collapse SOME under a "Partial" disclosure. | Cleaner default view. | Hides info user explicitly asked to see. |
| C | Show union with no aggregation badge. | Simplest. | Fails R3. |

**Recommendation: A.** Tri-state badges directly answer R3. The 25-workspace cap matches the existing `MEMBERS_PAGE_LIMIT_STEPS` philosophy and prevents N×fetch storms.

### 3d. Bulk mutation semantics (R4, R5)

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | **Sequential fail-fast** per `mem://constraints/no-retry-policy`: iterate selected wsIds, await each mutation, abort on first failure, show partial-success toast with `✅ k/N, ❌ wsName: reason`. | Honors the global no-retry contract. Predictable. | Slower than parallel for large N. |
| B | Parallel `Promise.all`. | Faster. | Violates "no recursive retry / no parallel storming" hygiene and makes per-ws error attribution muddy. |
| C | Sequential with continue-on-error. | Best UX for "do as much as possible". | Hides root cause if the first failure is also the diagnostic one. |

**Recommendation: A.** Matches existing constraint. Add per-row `SelectorAttempts`-style failure-log entries (`mem://standards/verbose-logging-and-failure-diagnostics`) so each ws failure surfaces `wsId`, `wsName`, `operation`, `email/userId`, `Reason`, `ReasonDetail`.

### 3e. Where promote/demote lives (R5)

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | **Both**: keep the `⋯` row menu inside the popup AND add a top-level `👑 Promote member…` / `👤 Demote member…` entry on the workspace-row right-click menu (single OR multi-select). The row menu opens a small picker (member dropdown + role toggle) when invoked outside the popup. | Matches R5's "directly by right-clicking" verbatim. Discoverable from two places. | Slightly larger right-click menu. |
| B | Row right-click only (remove from popup). | Compact popup. | Loses inline-edit affordance in popup; existing tests rely on it. |
| C | Popup-only (status quo). | No new surface. | Fails R5. |

**Recommendation: A.** Adding the row-menu entry costs ~2 menu items and one small picker UI; removing the popup version would regress shipped behavior covered by `ws-members-mutations.test.ts` + `ws-members-panel.test.ts`.

---

## 4. Implementation plan (15 sequential tasks — one per `next`)

1. **Spec** (this file) + `plan.md` sync. **← STEP 1, this session.**
2. `selected-workspaces-store.ts` — `getSelected() / setSelected() / toggle() / subscribe()`; pub/sub like `visible-workspaces-store.ts`. + 6 unit tests.
3. `ws-list-renderer.ts` — checkbox column, `Shift+click` range, `Ctrl/Cmd+click` toggle. Selection state mirrored from store. + 4 tests.
4. `ws-context-menu.ts` — detect `selected.size ≥ 2`; rename `Show Members` label to `👥 Show Members (N)` and route to bulk panel. + 3 tests.
5. `ws-members-fetch.ts` — `fetchMembersForMany(wsIds[], { cap: 25 })` — sequential, cached, returns per-ws `{ wsId, members, error? }`. + 5 tests.
6. `ws-members-aggregate.ts` (new pure module) — `aggregate(perWs[]) → { unionByUserId, presenceCount, total }`. + 8 tests.
7. `ws-members-bulk-panel.ts` (new) — bulk popup shell: header `"N workspaces · M unique members"`, tri-state badge column, sort, refresh. + 6 tests.
8. `ws-members-chip-input.ts` (new) — chip input component with RFC-5322 validation, paste-split, keyboard remove. + 10 tests.
9. Wire chip-input into bulk panel `Add` row + single-ws panel `Add` row (R1 applies to both). + 4 tests.
10. `inviteMemberMany(wsIds[], emails[], role)` in `ws-members-mutations.ts` — sequential fail-fast, partial-success result object. + 6 tests.
11. `updateMemberRoleMany` / `removeMemberMany` mirrors of step 10. + 6 tests.
12. Row right-click `👑 Promote member…` / `👤 Demote member…` (R5) — small picker mounted at click coords. Works for single-ws and bulk. + 4 tests.
13. Failure logging: every bulk failure emits `Reason` + `ReasonDetail` + per-ws `OperationAttempts[]` per the verbose-logging contract. + 3 tests.
14. Full sweep — run `npx vitest run standalone-scripts/macro-controller` from repo root; fix any regressions. Target 0 fail.
15. MINOR bump + changelog (`v3.42.0`), `readme.md` pin, `.gitmap/release/v3.42.0.json`, memory update at `mem://features/macro-controller/members-bulk-ops`.

---

## 5. Out of scope

- **Cross-org member transfer** (not requested).
- **Audit trail UI** for who changed what role (not requested; failure logs are server-side only).
- **Role types beyond `member` / `owner`** — API does not expose others.
- **Email autocomplete from prior invites** — possible follow-up, not in this issue.

---

## 6. Memory touchpoints

- Respects `mem://constraints/no-retry-policy` (sequential fail-fast in 3d/4).
- Respects `mem://standards/verbose-logging-and-failure-diagnostics` (per-ws failure shape in step 13).
- Composes with `mem://features/macro-controller/workspace-tooltip-members-popup` (Issue 113) — single-ws popup keeps shipped semantics; bulk popup is additive.
- New memory file at end: `mem://features/macro-controller/members-bulk-ops`.
