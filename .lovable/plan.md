# Plan

**Active workstream:** None — all queued workstreams complete as of v3.24.0.

**Recently shipped:** **v3.24.0 — Issue 117 (App): `pro_0` `past_due` workspaces showed Expired/0-credits** (2026-05-26). RCA + fix in `workspace-status.ts` (override no longer fires for `about-to-expire`; `past_due` with live grants reroutes to `about-to-refill`) + `ws-list-renderer.ts` (EXPIRED tier badge suppressed whenever any non-normal status pill renders). Tests: 35 new across `workspace-status.test.ts`, `ws-tier-badge-cancel-suppression.test.ts`, and new `past-due-credit-pipeline.test.ts` (real-pipeline integration on the exact RCA JSON, two permanent invariants encoded). Spec: `spec/22-app-issues/117-past-due-badge-credit-display-rca.md`.
**Recently shipped:** **v3.21.0 — Lovable Dashboard standalone script** (2026-05-25).
**Recently shipped:** **Issue 113 — Workspace tooltip + Members popup** (2026-05-25).
**Recently shipped:** **v3.12.0 — Workspace Label Refinement** (2026-05-25).


---

## `next` command convention (MANDATORY)

When the user says `next`:
1. Actually DO the next task this turn — never just announce or delegate it. No "say next for step X" stubs.
2. After completing it, list remaining tasks as a flat numbered list `1. 2. 3. 4.` — simple sequential integers, no `Step 7`, no decimals, no roman numerals.
3. Keep the sequence stable: when item 1 finishes, old item 2 becomes new item 1. Don't renumber arbitrarily.
4. If all tasks appear done, search prior chat/memory for leftover work and propose it as new numbered items.

---

## Remaining tasks

### Completed — Issue 116 (5 steps, v3.14.1) ✅
Spec: `spec/22-app-issues/116-credit-totals-modal.md`
- [x] Step 1 — Spec + pure logic module + 14 unit tests (`credit-totals.ts`)
- [x] Step 2 — UI module `credit-totals-modal.ts` + 11 modal tests
- [x] Step 3 — Wire menu item in `menu-builder.ts` + Refresh button
- [x] Step 4 — A11y: ESC-to-close, focus trap
- [x] Step 5 — Version bump 3.13.1 → 3.14.1, both changelogs, README pin

### Completed — Issue 114 (5 steps, v3.11.1) ✅
Spec: `spec/22-app-issues/114-pro-zero-credit-balance-calculation.md`
- [x] Step 1 — Pure calculator module + 12 unit tests
- [x] Step 2 — Wire calculator into pro-zero-credit-summary.ts + retire legacy branch for pro_0
- [x] Step 3 — Renderers consume enriched fields (status bar, hover card, Copy-JSON)
- [x] Step 4 — E2E harness + 6 fixtures
- [x] Step 5 — v3.11.1 bump, changelog, README, memory

### Completed — Release Page CI/CD Hardening Plan (8 steps) ✅
Spec: `plan.md` ("Release Page CI/CD Hardening Plan — 8 Steps")
- [x] Step 1 — Fix release checkout/ref resolution in `setup` job (added `git checkout` of resolved ref after version step).
- [x] Step 2 — Fix release-notes changelog range (verified: release.yml already excludes current tag with `grep -v -x "${VER}"`; nearest lower tag via `--sort=-version:refname`).
- [x] Step 3 — Add required release-asset verification before publish. (Implemented in `release.yml` lines 733–788; gates all required assets before `softprops/action-gh-release`.)
- [x] Step 4 — Make Release page install/download instructions complete. (Implemented in `release.yml` RELEASE_NOTES.md generation: pinned + latest one-liners, manual Chrome install steps, checksums, SLSA attestation.)
- [x] Step 5 — Add release-audit workflow for existing tags. (Implemented as `.github/workflows/audit-releases.yml`; scheduled weekly + manual dispatch.)
- [x] Step 6 — Update release documentation and RCA references. (Linked release-procedure.md from readme.md CI/CD section; created `scripts/release-publish.mjs`; updated Issue 95 RCA done-checklist.)
- [x] Step 7 — Validate without publishing a real release. (All workflow YAMLs pass YAML syntax validation; `scripts/release-publish.mjs` dry-run + syntax check passed.)
- [x] Step 8 — Final version bump + changelog/readme updates. (Bumped to v3.14.2 via `bump-version.mjs`; updated root + macro-controller changelogs; updated readme.md pinned version references.)

### Completed — Issue 117: Macro toolbar minimize/expand button squish RCA (5 steps, v3.15.0) ✅
Trigger: User reports a long-term bug where the Macro Controller toolbar buttons become squished together after minimizing the toolbar and expanding it again.
1. [x] Step 1 — Lifecycle map documented in `spec/22-app-issues/117-toolbar-button-squish/01-step1-lifecycle-map.md`.
2. [x] Step 2 — Root cause confirmed: `toggleMinimize` wipes inline `display:flex` via `el.style.display = 'none'|''`. Evidence: `02-step2-rca-evidence.md`.
3. [x] Step 3 — Fix: stash-and-restore of inline `display` in `panel-layout.ts`.
4. [x] Step 4 — Regression tests (5 tests, all pass).
5. [x] Step 5 — Version bump 3.14.2 → 3.15.0.

### Completed — Ctrl+Shift+Down shortcut fix (v3.20.0) ✅
Fixed in v3.20.0: keyboard shortcut and context-menu "Run scripts now" now always send `forceReload: true`, matching the popup Run button. Double-injection guard on forced manual launch splices script id out of body marker before dedup check.

### Completed — Issue 125: Dashboard Summary Bar, Auth Relocation & Expire Badge Color Fix (v3.38.0) ✅
Spec: `spec/22-app-issues/125-dashboard-summary-and-auth-relocation.md`
- [x] Step 1 — Spec.
- [x] Step 2 — `summary-bar/` module (`compute-summary.ts`, `types.ts`, `component.ts`, `index.ts`) + `compute-summary.test.ts`.
- [x] Step 3 — Panel wiring + Auth Diagnostics relocation into `Tools & Logs` accordion, collapsed by default. `panel.integration.test.ts`.
- [x] Step 4 — Filter-reactive subscription via `visible-workspaces-store.ts` pub/sub.
- [x] Step 5 — Expire badge tone fix (`expire-soon` → amber, `canceled` → muted gray, `expire` → red-orange). `classifier-tone.test.ts`.
- [x] Rolled into v3.38.0 bump + changelog.


Spec: `spec/22-app-issues/126-ctrl-shift-down-script-attach-shortcut.md`
- [x] Regression fix — `runScriptsFromShortcut` now reads tab URL, applies the `isNewTabOrBlankUrl` guard, resolves scripts via `resolveScriptsForShortcut`, and always force-reloads (popup Run parity).
- [x] Diagnostics — empty-set abort now logs `tabId`, `url`, `project="name" (id=…)`, `source`, `reason`, and a URL auto-attach candidate list so the silent-abort regression cannot recur.
- [x] Tests — `src/background/__tests__/shortcut-command-handler.test.ts` (5 tests, all green) covers active-project, no-active-project, empty-scripts, non-array defensive, and probe-failure paths.
- [x] Rolled into v3.38.0 bump.

### Completed — Issue 127: Prompts dropdown missing Plan row + Task Next sub-menu opens left and clips (v3.38.0) ✅
Spec: `spec/22-app-issues/127-plan-button-and-task-next-dropdown-overflow.md`
- [x] Task 1 — Repro + findings filed in spec §6.
- [x] Task 2 — `anchorTaskNextSub()` in `prompt-dropdown.ts` opens the sub-menu RIGHT of the row by default with a stacked-below fallback. `data-task-next-anchor="right"|"below"` exposes the decision. New tests in `task-next-right-anchor.test.ts` (10 tests, all green).
- [x] Task 3 — Re-added `Plan` row inside `prompt-dropdown.ts` (below Task Next), wired to existing `plan-task-ui.ts` opener with same right-anchor rule; `plan-row-in-prompts-dropdown.test.ts` added.
- [x] Task 4 — Full test sweep; existing `tasks-right-anchor` / `tasks-toggle-hover-open` / `plan-task-ui` / `prompts-panel-layout` tests still pass.
- [x] Task 5 — Rolled into v3.38.0 bump + changelog.

### Completed — Issue 128: Queue auto-resume when loop running (v3.38.0) ✅
Spec: `spec/22-app-issues/128-queue-auto-resume-when-loop-running.md`
- [x] Task 1 — `readQueueCount()` + `readQueueCountDetailed()` with 3-tier selector waterfall + 10 tests.
- [x] Task 2 — `autoResumeQueueIfNeeded()` with 6 policy branches + safety guards, wired into loop heartbeat tick + 9 tests.
- [x] Rolled into v3.38.0 bump + changelog.

### Completed — Gitsync "Open GitHub repo" fix (v3.19.0) ✅
Fixed in v3.19.0: rewrote `gitsync-api.ts` to route through `window.marco.api.call("projects.gitsync", …)` SDK path so `Authorization: Bearer` header is always attached.

### Completed — Lovable Dashboard standalone script (v3.21.0) ✅
Migrated `home-screen` content-script features into `standalone-scripts/lovable-dashboard/`. Build-pipeline test added.

### Blocked on user input / secrets
- **P1 — Release installer hardening v0.2 (SLSA + minisign signing)** — *Blocked on `MINISIGN_SECRET_KEY` GitHub secret.*
- **Empty-workspace bug diagnosis** — *Blocked: needs clean `\run.ps1 -d` build log + browser console output.*

### Deferred
- **P2 — P Store spec** — *Discuss-later mode per user instruction.*
- **Cross-Project Sync & Shared Library** — *Depends on P Store.*
- **Prompt Click E2E (52/53)** — *Deferred.*
- **S-055 — P Store Backend API** — *Blocked on P2.*

### In-memory audit not yet on active backlog
- **Idle loop perf audit (2026-04-25)** — ✅ All actionable items fixed (PERF-1..13). PERF-14/15 are Low/no-action. See `mem://performance/idle-loop-audit-2026-04-25`.
- **S-021 — Chrome Extension Test Coverage Expansion** — ✅ Done. 2190 tests passing as of v3.21.0.

---

## Completed workstreams (recent)

### Issue 111 — Open Lovable Tabs / Per-Tab Workspace Mapping (2026-05-25)
- Background handler (`open-tabs-handler.ts`) queries `chrome.tabs` for Lovable URLs, probes each tab via `chrome.tabs.sendMessage` with `PROBE_DETECTED_WORKSPACE`.
- Content-script relay (`message-relay.ts`) forwards probe to MAIN-world responder and returns async reply.
- Page-side responder (`page-workspace-responder.ts`) snapshots `state.workspaceName` + cached workspace ID + project ID + source (api/cache/dom/none).
- UI panel (`section-open-tabs.ts`) renders focus badge, active badge, project name (green), probed workspace (amber), or error fallback (gray italic). Copy-URL and refresh buttons included.
- 11 Vitest tests (6 probe-responder + 5 section rendering). Typechecks clean. No new permissions.

### Issue 113 — Workspace tooltip + Members popup + Settings removal (2026-05-25)
- Native `title=` tooltips stripped from `ws-list-renderer.ts` (3 call sites); single shared `<div>` hover card via `ws-hover-card.ts`.
- Compact layout: workspace name + plan pill; credits bar; refill + expiry rows; collapsible priority rules `<details>`.
- Color-coded credit health (`--success` / `--warning` / `--destructive`) and lifecycle tone mapping.
- Settings (gear) button + `settings-modal.ts` imports removed from panel header; dead UI eliminated.
- Members panel promoted from inline list to popup (reuse Rename chrome): header, member rows with avatar/name/email/role/`⋯` menu, Add/Remove/Promote mutations with cache invalidation.
- 10 steps complete. See `spec/22-app-issues/113-workspace-tooltip-and-members-popup.md`.

### v3.12.0 — Workspace Label Refinement (2026-05-25)
- Unified workspace badge system: all `expired*` variants collapse to muted gray `Cancel`; `about-to-expire` → `Expire Nd` (amber) / `Expired Nd` (red); `about-to-refill` → `Refill Nd` / `Refill today` (sky).
- Single `classifyFromStatus` + `resolveBadgeStyle` shared by row list and hover card; duplicate pill maps removed.
- Refill-soon filter chip added to workspace toolbar.
- 28 tests (classifier, tone resolver, composition, chip).
- Issue 115 complete; 10 steps done.

### v3.10.2 — Refill Priority + GitHub Open (2026-05-24)
- Button row overflow hardened (`min-width:0`, `overflow:visible`)
- `REFILL_PRIORITY_WINDOW_DAYS = 10` + score/sort helper + 9 unit tests
- "Refill priority" filter toggle with `R Nd` inline badge (sky/amber/slate)
- GitHub repo open via right-click with `marco.kv` gitsync cache (negative-result memoization)
- Minor bump 3.9.3 → 3.10.0 + changelog + README pin

### Prompt Section Enhancements (v?.?.?) — 2026-05-22
All 15 steps done: `Plan Task` inline submenu + template, `Filter` multi-select submenu, copy/paste hint removed, Load button moved, CRUD fixed via `rerenderPromptsDropdown()` helper, dark-theme tokens, typecheck clean.

### HTTP Fail-Fast Enforcement (v3.5.2)
All 10 steps complete. See `.lovable/plans/http-fail-fast-10-step.md`.
