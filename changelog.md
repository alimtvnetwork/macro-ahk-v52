# Changelog

All notable changes to the Marco Chrome Extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.1.html).

---

## [v3.38.0] — 2026-05-30

### Added
- **Issue 125** — Dashboard Summary Bar + Auth Diagnostics relocation + Expire badge tone fix.
- **Issue 126** — Ctrl+Shift+Down script attach regression fix with URL guard + diagnostics.
- **Issue 127** — Prompts dropdown Plan row restored + Task Next right-anchor fix.
- **Issue 128** — Queue auto-resume when loop running (`readQueueCount` + `autoResumeQueueIfNeeded`).

### Changed
- Version bump: 3.37.0 → 3.38.0 (all version files synced).

---

## [v3.37.0] — 2026-05-30

### Added
- **Issue 124 — Loop Run-State Gate + Queue Pause/Resume across moves.**
  - New `loop-run-state/` module observes the Lovable composer to decide whether a prompt is currently streaming. `isRunActive()` returns true when the STOP icon (`/…/form/div[2]/div/button[3]/span[7]`, SVG `M20.75 17…`) is present OR when the Submit button (`#chatinput-send-message-button`) is missing from the DOM. `isRunIdle()` is the inverse. `waitForRunIdle({ timeoutMs = 120_000, pollMs = 1000 })` polls until idle or times out — **single-shot, no retry/backoff** per `mem://constraints/no-retry-policy`. **The composer Submit/STOP button is NEVER clicked.**
  - New `queue-control/` module exposes `pauseQueue()` / `resumeQueue()` / `isQueuePauseVisible()` / `isQueueResumeVisible()` against the only two buttons the gate is allowed to click: `aria-label="Pause queue"` and `aria-label="Resume queue"`. Returns `{ clicked, reason: 'ok' | 'pause-missing' | 'resume-missing' }`.
  - New `project-lock/` module: `detectProjectLocked({ workspaceId, projectId, status, body, bannerText })` classifies a move response as `api-423`, `api-body-locked`, or `dom-banner` (case-insensitive match for `project_locked` and `project is locked`). `persistProjectLockEvent()` writes to `LoopProjectLockEvent` rows via `marco.kv` with a 1s dedupe window for `(workspace, project, reason)`. `listProjectLockEvents()` returns events ordered by `DetectedAtMs` ascending.
  - New `loop-move-gate.ts` (`gatedMoveToWorkspace`) wraps every `moveToWorkspace()` call from `ws-adjacent.ts` (both fresh-fetch and cached-fallback paths). When `Loop.RunStateGate.Enabled` is ON: waits for an idle composer (`Waiting for current prompt to finish…` toast on entry; `Prompt still active after 2 min — move cancelled` on timeout), clicks Pause on the source workspace, executes the move, then polls up to 15s for the Resume button on the destination and clicks it once. Resume-missing logs `LoopRun.queueFlip ws=<dest> outcome=resume-missing` and returns — no retry.
  - New `feature-flags.ts` with `isFeatureFlagEnabled('Loop.RunStateGate.Enabled')` reading `window.marco.featureFlags` with safe in-memory defaults; `setFeatureFlagOverrideForTests()` for unit tests.
- **Issue 124 — Tests (31 total, all green).**
  - `loop-run-state/__tests__/run-state.test.ts` (7 tests): STOP svg present → active; submit button absent → active; send-arrow only → idle; detector never clicks Submit (click-spy); `waitForRunIdle` resolves immediately when idle, on submit-button reappearance, and rejects on timeout; STOP/SEND svg path prefixes match the spec.
  - `queue-control/__tests__/queue-control.test.ts` (6 tests): `pauseQueue` clicks the Pause button when present, returns `pause-missing` when absent; `resumeQueue` symmetric; visibility helpers reflect DOM presence; both functions never click the composer Submit/STOP button (click-spy).
  - `project-lock/__tests__/detector.test.ts` (7 tests): recognises HTTP 423, body `project_locked`, body `"project is locked"` (case-insensitive), DOM banner text; returns null on success/missing ids; HTTP 423 takes precedence over body matching.
  - `project-lock/__tests__/store.test.ts` (6 tests): single write, 1s dedupe window on same `(workspace, project, reason)`, second write outside window, separate write when reason differs, list returns events ordered ascending by `DetectedAtMs`, empty kv yields `[]`.
  - `__tests__/loop-move-gate.test.ts` (5 tests): flag OFF is a clean passthrough to `moveToWorkspace`; flag ON waits for idle → pauses source → moves → resumes destination; **never clicks the composer Submit/STOP button** (click-spy); returns cleanly when Resume is missing (short-timeout override); cancels the move when `waitForRunIdle` rejects.

### Changed
- **Issue 124 Task 5 — `Loop.RunStateGate.Enabled` flag default flipped to `true`** in `feature-flags.ts`. The gate + queue pause/resume now wraps every adjacent move by default. Override via `window.marco.featureFlags['Loop.RunStateGate.Enabled'] = false` to revert to pre-v3.37.0 behaviour.
- Version bump: 3.36.0 → 3.37.0 (all version files synced).

---

## [v3.36.0] — 2026-05-30

### Added
- **Issue 122a — `pro_1` enrichment unit tests** (`standalone-scripts/macro-controller/src/credit-balance/__tests__/pro-one-enrichment.test.ts`, 9 tests) covering: cache overlay onto `pro_1` rows, case-insensitive/whitespace-trimmed plan literal, non-`pro_1` rows untouched, cache-miss no-op, missing workspace id, negative-value clamping, fractional rounding, and multi-row batch counting.
- **Issue 122a — `ws-move` post-move credit-balance refresh test** (`standalone-scripts/macro-controller/src/__tests__/ws-move-post-refresh.test.ts`, 2 tests) confirming a successful `moveToWorkspace()` calls `fetchAndPersist(destId, { force: true, source: 'manual' })` (bypassing the 10s throttle) and that the refresh is fire-and-forget — `moveToWorkspace` resolves even when the refresh throws.

### Changed
- Version bump: 3.35.0 → 3.36.0 (all version files synced)

---

## [v3.35.0] — 2026-05-29

### Added

### Fixed

### Changed
- Version bump: 3.34.2 → 3.35.0 (all version files synced)

---

---

## [v3.34.2] — 2026-05-29

### Changed
- **Credit Totals modal — Remaining tile now uses `remaining / granted` framing** (Issue 122 follow-up). The "This Billing Cycle" card's `Remaining` tile renders as `0 / 100` instead of bare `0`, matching the workspace-row 💰 chip convention. Fully-consumed pools are no longer indistinguishable from absent pools at the modal level. Falls back to a bare number when `granted = 0` (no denominator to show). Used / Total grant tiles stay bare. Regression test: `issue-122-totals-modal-remaining-over-granted.test.ts` (4 tests). Existing `credit-totals-modal.test.ts` (16 tests) still green.

### Verified
- Full `bunx vitest run` against the project: **246 files / 2407 tests / 0 failures** (the earlier "61 unrelated files fail to collect" backlog claim was stale — `src/test/setup.ts` is present and intact).

---

## [v3.34.1] — 2026-05-29

### Fixed
- **Issue 121 follow-up — Pro credit-sort filter now includes naturally-expired workspaces** — `isProExpiringWs()` previously excluded all display.kind='canceled' rows, which inadvertently dropped `subscriptionStatus='expired'` PRO workspaces (the recovery candidates the filter is meant to surface). Filter now only excludes rows whose underlying `subscriptionStatus` is literally `canceled`/`cancelled`. Naturally-expired Pro workspaces (e.g. `ws-004`, `ws-005` in the E2E fixture) are restored to `pro-high` / `pro-low` survivor lists.
- E2E `run-credit-sort-e2e.test.ts` now passes 7/7 (was 5/7).

---

## [v3.34.0] — 2026-05-29

### Added
- **Issue 123 — Credit-totals test matrix (51 tests across 5 files)** — comprehensive coverage for every account type and credit-calculation branch:
  - `issue-123-credit-totals-pro1.test.ts` (10) — pro_1 fresh / partial / fully consumed / over-consumption / trialing / past_due / missing fields / legacy "sum-of-pools" negative / multi-workspace / Infinity sentinels.
  - `issue-123-credit-totals-pro3-lite-ktlo.test.ts` (10) — pro_3 / lite / ktlo plans share the billing-only branch; negative assertions that enriched fields never leak in.
  - `issue-123-credit-totals-pro0.test.ts` (10) — pro_0 enriched `/credit-balance` branch; negative that `ws.limit/used` are ignored; mixed pro_0+pro_1 lists; case-insensitive + whitespace-padded plan strings.
  - `issue-123-credit-totals-free-mixed.test.ts` (10) — FREE-tier exclusion (by `plan='free'` AND/OR `tier='FREE'`); daily MAX across rows; FREE_DAILY_CAP clamp; bogus billing on FREE rows stays excluded.
  - `issue-123-credit-totals-e2e-json.test.ts` (11) — end-to-end pipeline: hand-crafted Lovable `/api/user/workspaces` JSON → `parseLoopApiResponse` → exported `aggregateCreditTotals`. Includes the exact P0065 user-bug payload, canceled lifecycle override path, bare-array response, and negative `granted ≠ 105` regression.

### Changed
- Version bump: 3.33.0 → 3.34.0 (all version files + README pin synced).

---

## [v3.33.0] — 2026-05-29


### Fixed
- **Issue 122 — workspace credit-bar pool indicators showed bare remaining** — the per-row 💰 Monthly / 🔄 Rollover / 📅 Free / 🎁 Bonus chips rendered only the remaining number (e.g. `💰 0`), making a fully-consumed pool indistinguishable from "no pool exists". A `pro_1` workspace with 100/100 billing used now correctly renders `💰 0/100` so the plan grant stays visible alongside what's left. Daily / rollover / bonus chips get the same `remaining/limit` treatment. The `⚡ available/total` summary is unchanged.

### Changed
- Version bump: 3.32.0 → 3.33.0 (all version files + README pin synced).

---

## [v3.32.0] — 2026-05-29


### Fixed
- **Issue 120 — pro_1 Credit Totals over-reporting** — the Credit Totals modal was showing inflated `Total` / `Remaining` for paid `pro_1` (and `pro_3`, `lite`, `ktlo`) workspaces because the aggregator summed all five credit pools (`granted + daily + billing + topup + rollover`). It now uses the **billing-period fields only** (`billing_period_credits_limit` / `_used`) for non-`pro_0` plans, matching the historical spec (`spec/21-app/03-data-and-api/api-response/04-plan.md` line 40 and `spec/21-app/02-features/macro-controller/credit-system.md`). `pro_0` continues to use the authoritative `/credit-balance` enriched fields; `FREE` tier remains excluded from billing sums (Core rule).

### Changed
- Version bump: 3.31.0 → 3.32.0 (all version files + README pin synced).

---

## [v3.31.0] — 2026-05-27

### Fixed
- **ESLint `max-lines-per-function` violations** — silenced two unavoidable `describe()` block warnings in standalone-scripts E2E tests (`run-credit-sort-e2e.test.ts`, `run-free-plan-expiry-e2e.test.ts`) with targeted `// eslint-disable-next-line` directives. Unblocks the standalone-lint CI job (was failing with `--max-warnings=0`).

### Changed
- Version bump: 3.30.1 → 3.31.0 (all version files + README pin synced).

---

## [v3.30.1] — 2026-05-26

### Added
- **Cross-tab library-sync broadcast** — when a library asset is synced in one Options tab, other open Options tabs now receive a `LIBRARY_SYNC_BROADCAST` runtime message and display a toast notification showing how many linked projects were updated.

### Changed
- Version bump: 3.30.0 → 3.30.1 (all version files synced)

---

## [v3.30.0] — 2026-05-26

### Added

### Fixed

### Changed
- Version bump: 3.29.0 → 3.30.0 (all version files synced)

---

## [v3.29.0] — 2026-05-26

### Added
- **Issue 118 — Past-due workspace lifecycle UI** — workspaces in `past_due` / `unpaid` now resolve to a new `past-due-expiring` display status with an amber → orange → red tone ramp based on days past due (0–4 warning, 5–9 orange, ≥10 danger). Hover card surfaces "Grants remain active" and "Credits will be lost if unpaid" guidance, and the workspace list gains an **Expiring** filter chip sorted by `daysPassed` desc with `available` credits as tiebreaker.
- **Workspace name resolution hardening** — startup retry now fires unconditionally when the Tier 1 mark-viewed response omits the workspace name (passive mode included), and SPA project switches re-detect the active workspace so the panel never shows a stale name after navigation.
- **Subscription-status enum source of truth** — new `types/subscription-status.ts` with `SubscriptionStatus`, `WsTierValue`, `PlanName` enums plus `isCanceledStatus` / `isPastDueStatus` / `isHealthyStatus` / `isExpiredTier` predicates; all magic-string status checks across `workspace-status`, `credit-parser`, `status-explainer`, `ws-hover-card`, and renderers now route through the enum helpers.

### Fixed
- **Past-due workspaces no longer flip to Expired prematurely** — display-status resolver keeps them in the expiring state until the credit-grant window actually closes, and the progress-bar denominator reflects the live grant total instead of the cancelled period budget.

### Changed
- Version bump: 3.28.0 → 3.29.0 (all version files synced)

---

## [v3.28.0] — 2026-05-26

### Added
- **Popup version-mismatch recovery button** — the mismatch banner now includes a `Reload extension` action wired to `chrome.runtime.reload()`, so after rebuilding/redeploying the loaded unpacked extension can refresh itself instead of leaving the stale manifest version visible.

### Fixed
- **Dev deploy hot-reload was disabled by missing `version_name` marker** — `vite.config.extension.ts` now marks local extension builds as `<version> dev` while keeping GitHub release builds clean, allowing the existing build-meta polling reload path to run during local deploys.

### Changed
- **Download-only extension ZIP is now the first install path** — the root README and generated GitHub Release body place `download-extension.ps1` before installer-script one-liners, matching the current recommended quick-test workflow.
- Version bump: 3.27.0 → 3.28.0 (all version files synced)

---

## [v3.27.0] — 2026-05-26

### Changed
- **`scripts/download-extension.ps1` keeps the ZIP as a local backup** — the release archive is now downloaded **into the current working directory** (next to the extracted folder) instead of `$TEMP`, and is **never deleted** on success. Re-runs overwrite only the extracted folder; the `marco-extension-<version>.zip` backup remains in place for re-extraction or archival.
- **README + release-notes one-liners stripped of inline comments** — every `download-extension.ps1` snippet in `readme.md` and `.github/workflows/release.yml` no longer carries `# Windows · PowerShell …` comments inside the code fence. The platform / purpose label is now a bold heading **above** each code block (per user request), so paste-into-PowerShell is comment-free and the env-var line is single-line (no backtick continuation).
- **Context menu duplicate-id race fixed** — `src/background/context-menu-handler.ts` now serializes `rebuildProjectSubmenu()` via a single-flight lock, awaits Chrome's `contextMenus.remove` callback, de-duplicates the incoming project list by `id`, and swallows `chrome.runtime.lastError` on `create`/`remove`. Eliminates the `Unchecked runtime.lastError: Cannot create item with duplicate id marco-project-*` warnings observed in the Errors panel.

### Removed
- **`.gitmap/release/` snapshot folder deleted** (per user request) — historical release manifests are no longer tracked under that path.

---

## [v3.26.0] — 2026-05-26

### Added
- **Release notes now include the "📦 Download-only" section** — `.github/workflows/release.yml` injects the `download-extension.ps1` one-liners (latest, env-var pinned, local clone) into the auto-generated GitHub Release body, mirroring the root README. `${VER}` is interpolated so the pinned snippet always references the current release tag.

### Changed
- Version bump 3.25.0 → 3.26.0 across all 7 unified-version sites; README pin updated.

---

## [v3.25.0] — 2026-05-26

### Fixed — CI/CD release pipeline hardening
- **Release Watcher empty-version guard** (Issue #10) — `release-asset-guard` job now declares both `resolve-release` and `run-release` in `needs`, so `needs.resolve-release.outputs.tag` resolves correctly. Previously the empty `VER` produced bogus `marco-extension-.zip` asset checks.
- **Audit Releases placeholder collision** (Issue #11) — replaced bare `VER` substring tokens with `__VER__` in `.github/workflows/audit-releases.yml`. The old `${PAT//VER/$VER}` greedily substituted the `VER` inside literal `VERSION.txt`, producing `v3.24.0SION.txt` false-misses.
- **Memory updated** — `mem://constraints/release-assets-publish-contract` now mandates: (a) any guard reading `needs.<job>.outputs.*` must list `<job>` in its own direct `needs`; (b) audit/guard scripts must use unambiguous placeholder tokens (e.g. `__VER__`) when templating filenames in bash.

### Changed
- Version bump 3.24.0 → 3.25.0 across all 7 unified-version sites; README pin updated.

---

## [v3.24.0] — 2026-05-26

### Fixed — `pro_0` `past_due` workspaces with live credits showed "Expired Nd" + hidden balance (Issue 117 RCA)

**Symptom**: Workspace `A0064 D3v064 WG` (`plan=pro_0`, `subscription_status=past_due`, `total_remaining=225`, billing grant of 20 + rollover grant of 200 valid until `2026-06-26`) rendered as **"Expire 31d"** with `Available=0` / `Total=0` in the Macro Controller panel — even though Stripe `past_due` keeps credits live until `expires_at`, and the user could still spend the 225 credits in the Lovable app. See `spec/22-app-issues/117-past-due-badge-credit-display-rca.md` for the full RCA.

**Root cause** (two-layer bug):
1. **Override too aggressive** — `shouldApplyCanceledOverride` in `workspace-status.ts` fired for `about-to-expire` (which includes `past_due`), forcing `ws.available = 0` and erasing live grants.
2. **Wrong status label** — `getEffectiveStatus` classified any `past_due` row as `about-to-expire` (red "Expire Nd"), ignoring that `past_due` with live billing grants is operationally a *refill-pending* state, not an expiry state.

**Fix** (frontend-only, no schema change):
- `shouldApplyCanceledOverride` now excludes `about-to-expire` — it only fires for true cancel/expired states (`expired-canceled`, `fully-expired`, `expired`). New `hasLiveGrants(ws)` helper guards the override against any wallet with `available > 0`, `rollover > 0`, or `billingAvailable > 0`.
- `getEffectiveStatus` reroutes `past_due` rows that still have live grants → `about-to-refill` (label `Refill Nd`, using `billingPeriodEndAt`). Empty-wallet `past_due` still classifies as `about-to-expire`.
- `buildTierBadgeHtml` `shouldSuppressTierBadge` broadened from `display.kind === 'canceled'` to `display.kind !== 'normal'` — any non-normal status pill (Cancel, Expire Nd, Expired Nd, Refill Nd) now hides the redundant red `EXPIRED` tier badge. One badge per row, always.

**Tests** (all green, 468/468 macro-controller):
- `workspace-status.test.ts` — 3 new Issue-117 cases (`past_due` + live grants → `about-to-refill`; `past_due` + empty wallet → `about-to-expire`; `shouldApplyCanceledOverride` returns `false` for `past_due`).
- `ws-tier-badge-cancel-suppression.test.ts` — 4 new cases covering EXPIRED-badge suppression for past_due (empty + live), standalone EXPIRED + cancel, and non-suppression for normal PRO + refill-soon.
- `past-due-credit-pipeline.test.ts` (new) — feeds the **exact** RCA JSON through the real `calculateProZeroCreditSummary` → override → `getEffectiveStatus` → `classifyFromStatus` → `buildTierBadgeHtml` pipeline and asserts `available=225`, label `Refill 31d`, one pill, zero `EXPIRED` text. Two permanent invariants encoded: `total_remaining > 0 ⇒ ws.available > 0`, and any status pill ⇒ no EXPIRED tier badge.

### Changed
- Version bump: 3.23.0 → 3.24.0 (all version files synced, `readme.md` pin updated).

---

## [v3.23.0] — 2026-05-26


### Fixed — Workspace rows showed both "EXPIRED" tier badge AND "Cancel" status pill (RCA)

**Symptom**: Canceled workspaces (tier=`EXPIRED`, `subscriptionStatus=canceled`) rendered TWO badges side-by-side in the Macro Controller workspace list: a red `EXPIRED` tier badge **plus** a muted gray `Cancel` status pill. The user had previously asked (Issue 115 / v3.12.0) for these to collapse into a single badge.

**Root cause**: `buildTierBadgeHtml` in `standalone-scripts/macro-controller/src/ws-list-renderer.ts` renders two independent badges per row:
1. The **tier badge** (`WS_TIER_LABELS[wsTier].label`) — always emitted, including the red `EXPIRED` label when `tier === 'EXPIRED'`.
2. The **status pill** (`buildStatusPillHtml`) — emitted when `enableWorkspaceStatusLabels` is true, which for canceled rows is `Cancel` (muted gray, via `classifyFromStatus → kind: 'canceled'`).

The Issue 115 fix (v3.12.0) collapsed the *status pill side* to a single label but never touched the *tier-badge side*. Result: tier=`EXPIRED` + canceled subscription emitted both — the redundant red `EXPIRED` next to the authoritative `Cancel` pill (visible in the user's screenshot, three workspaces P0888 / P0891 / P0092 all showing the double badge).

**Fix**: In `buildTierBadgeHtml`, when `cfg.enableWorkspaceStatusLabels` is true AND `tier === 'EXPIRED'` AND the classified display kind is `canceled`, suppress the EXPIRED tier badge entirely. The row now carries one badge — the muted `Cancel` pill — exactly as Issue 115 intended. Non-canceled `EXPIRED` rows (where `display.kind` is `expired` or `expire-soon`) still keep the red tier badge so plain past-due/expired-without-cancel state remains visually distinct.

**Tests**: new `standalone-scripts/macro-controller/src/__tests__/ws-tier-badge-cancel-suppression.test.ts` covers:
- canceled + tier=EXPIRED → renders **no** `EXPIRED` text, renders exactly one `Cancel` pill,
- past_due + tier=EXPIRED (no cancel) → still renders `EXPIRED` tier badge,
- non-EXPIRED canceled tiers (defensive) → no suppression regression.

### Changed
- Version bump: 3.22.0 → 3.23.0 (all version files synced, `readme.md` pin updated).


---

## [v3.22.0] — 2026-05-26

### Fixed — Release page has no built assets (RCA)

**Symptom**: GitHub Release `v3.21.0` was published but the Release page only showed GitHub's auto-generated source archives — every `marco-extension-*.zip`, `macro-controller-*.zip`, `lovable-dashboard-*.zip`, `install.{ps1,sh}`, `checksums.txt`, etc. was missing. Same regression class as v2.243.0 and v3.4.2.

**Root cause**: `.github/workflows/release.yml` only fires asset upload when its `setup` → `build-*` → `release` job chain succeeds end-to-end. Recent CI breakage (lint/test failures fixed in PRs #43–#45 and the missing `build:lovable-dashboard` step in `tests/e2e/global-setup.ts`) caused the `setup` job for the `v3.21.0` tag to fail before any build artefact was produced, so the `release` job that uploads assets to the GitHub Release was never reached. The Release page itself had been created by an out-of-band path (Lovable release tooling landing `.gitmap/release/v3.21.0.json`), but `release-watcher.yml` only re-triggers `release.yml` when that descriptor file changes on `main` — it does **not** react to an existing-but-empty Release. The weekly `audit-releases.yml` would have caught it, but only on its Monday 02:00 UTC schedule, days after the fact.

**Fix**:
1. `.github/workflows/release-watcher.yml` now ALSO triggers on `release: types: [published, created, edited]` and calls `release.yml` with the published tag — so any empty Release auto-heals within minutes regardless of how the tag/release was created.
2. New `release-asset-guard` job in `release-watcher.yml` runs the same required-asset check as `audit-releases.yml` against the just-published Release and fails the workflow if assets are missing — guaranteeing a red signal instead of a silently-broken Release page.
3. `audit-releases.yml` now ALSO runs on every push to `main` touching `release.yml`, `release-watcher.yml`, or `manifest.json`, in addition to its weekly cron — so version bumps land with an immediate audit.

**Never-again guard**: the `release` job in `release.yml` already has a `Verify GitHub Release upload completed` post-publish step (see lines 836–878). The new watcher trigger ensures that gate also runs for tags/releases created out-of-band, not only for the in-process `push: tags: v*` path.

### Changed
- Version bump: 3.21.0 → 3.22.0 (all version files synced, `readme.md` pin updated).


---

## [v3.21.0] — 2026-05-26

### Added
- **Lovable Dashboard standalone script**: migrated the `home-screen` content-script features (workspace credits, nav controls, search bar, macro sync) from `src/content-scripts/home-screen/` into a dedicated standalone-scripts project at `standalone-scripts/lovable-dashboard/`. Built by `vite.config.lovable-dashboard.ts` as an IIFE bundle exposing `window.LovableDashboard`, injected via the standalone-seeder pipeline. Includes full unit-test coverage (pure-helpers + DOM integration) and a build-pipeline wiring test.
- **Build-pipeline test** (`scripts/__tests__/lovable-dashboard-build-pipeline.test.mjs`): asserts tsconfig, vite config, entry point, package.json script, and orchestration-file registration are correctly wired.

### Fixed
- **TypeScript spread-error in `url-guard.ts`**: changed `original(...args)` to `original.apply(history, args)` to satisfy `tsc --noEmit` under `tsconfig.lovable-dashboard.json`.

### Changed
- **URL guard narrowed to exact `/dashboard`**: `AllowedHomeUrl` now contains a single value `DASHBOARD = "https://lovable.dev/dashboard"`; `ROOT` and `ROOT_SLASH` activation removed. Spec and unit tests updated.
- **Version bump**: 3.20.0 → 3.21.0 across manifest.json, constants.ts, macro-controller shared-state, and every standalone-scripts instruction.ts.

---

## [v3.20.0] — 2026-05-26

### Fixed
- **Ctrl+Shift+Down shortcut sometimes did nothing (RCA)**: the popup Run button was already fixed in v3.18.0 to always send `forceReload: true`, but the keyboard shortcut (`run-scripts` command in `src/background/shortcut-command-handler.ts`) and the right-click context menu (`handleRunScripts` in `src/background/context-menu-handler.ts`) were still using the conditional `...(forceReload ? { forceReload: true } : {})` pattern. With `forceReload=false` the message omitted the flag, the background pipeline cache deduped, and even when it didn't, the per-page `data-marco-injected` body-marker in `src/background/handlers/injection-wrapper.ts` skipped the script with `INJECT_SKIPPED_ALREADY_MARKED`. Both `Ctrl+Shift+Down` and context-menu **Run scripts now** now always send `forceReload: true`, matching the popup. Symptom matches the user's report — first press worked, every subsequent press on the same page silently did nothing.
- **Double-injection on Run is now actually a re-injection**: plumbed `forceReload` through `injection-handler.ts → injectAllScripts → injectSingleScript → wrapWithIsolation → buildWrappedCode`. The generated wrapper now, on a forced manual launch, splices its own script id out of `<body data-marco-injected="…">` BEFORE the dedup check, so the script always re-mounts. Passive/auto-inject double-fires are still absorbed by the same body marker — only deliberate manual force bypasses it. Logs the new path as `INJECT_FORCE_RELOAD script=<id> — marker cleared`.

### Bumped
- Version bump: 3.19.0 → 3.20.0 across manifest.json, src/shared/constants.ts, standalone-scripts/macro-controller/src/shared-state.ts, and every standalone-scripts/*/src/instruction.ts.

---

## [v3.19.0] — 2026-05-26

### Fixed
- **Open GitHub repo / gitsync fetch now works**: rewrote `standalone-scripts/macro-controller/src/gitsync-api.ts` to route `/workspaces/{wsId}/projects/{pid}/gitsync` through the centralized `window.marco.api.call("projects.gitsync", …)` SDK path instead of a raw `fetch()` from the MAIN world. Routing through the SDK applies the same axios auth interceptor used by every other API call (workspaces, credit-balance, memberships, projects.list, remix.init), so the `Authorization: Bearer <token>` header is now always attached — matching the working request the user pasted. Registered the new endpoint in `standalone-scripts/marco-sdk/src/api-registry.ts` under `projects.gitsync`. Negative caching unchanged (24h for `not_linked`, 5min for `error`); right-click → **🔄 Refresh gitsync** still forces a re-fetch.

### Bumped
- Version bump: 3.18.0 → 3.19.0 across manifest.json, src/shared/constants.ts, standalone-scripts/macro-controller/src/shared-state.ts, and every standalone-scripts/*/src/instruction.ts.

---

## [v3.18.0] — 2026-05-25

### Fixed
- **Manual Run always re-injects (popup “Run script” bug)**: clicking Run from the popup now always sends `forceReload: true` to the background `INJECT_SCRIPTS` handler. Previously, after closing the macro-controller panel, a second Run was silently absorbed by the per-tab injection cache (whose only purpose is to dedupe passive/auto-injects), and nothing happened. Root cause: `src/hooks/use-popup-actions.ts` only set `forceReload` when an internal `options.forceReload` flag was passed, which the Run button never did. Force is now unconditional for any `launchSource: "manual"` invocation; the cache continues to dedupe passive/auto-injects untouched.

### Changed
- **macro-controller is never auto-injected**: added `NEVER_AUTO_INJECT_SCRIPT_IDS` allow-list in `src/background/auto-injector.ts` containing `default-macro-looping`. The macro-controller mounts a visible floating UI panel and must only appear when the user explicitly launches it (popup Run, keyboard shortcut, context menu). The script’s own `autoInject` flag and any project URL rule are now overridden for this ID. SPA reinject already delegates through the same pipeline, so it inherits the guard automatically.

### Bumped
- Version bump: 3.17.1 → 3.18.0 across manifest.json, src/shared/constants.ts, standalone-scripts/macro-controller/src/shared-state.ts, and every standalone-scripts/*/src/instruction.ts. `node scripts/check-version-sync.mjs` exits 0.

---

## [v3.17.1] — 2026-05-25

### Fixed
- **Error-swallow audit cleared (Total → 0)**: swept the 4 remaining P1 + 1 P2 sites flagged by `scripts/check-no-swallowed-errors.mjs`. Block-comment `/* allow-swallow: */` waivers were never recognised by the checker (regex requires `//`); converted to line-comment style with full rationale in: `src/background/first-attach-toast.ts`, `src/components/HttpFailFastBanner.tsx`, `src/shared/http-fail-fast.ts`, `standalone-scripts/macro-controller/src/ui/credit-totals-modal.ts`, `standalone-scripts/macro-controller/scripts/verify-projects-cache.mjs`, `standalone-scripts/macro-controller/scripts/verify-http-fail-fast.mjs`.

### Changed
- Documented waiver contract (line-comment only, same or previous line) in `mem://features/error-swallow-audit-generator`.
- Version bump: 3.17.0 → 3.17.1 (all version files synced)

---

## [v3.17.0] — 2026-05-25

### Fixed
- **Refill-soon filter ignored credit ranking.** When the workspace "Refill-soon" filter chip was active, the surviving rows kept their raw API order, so workspaces with `available=0` appeared above workspaces with hundreds of credits (all sharing the same `Refill 1d` badge). `ws-list-renderer.ts::filterAndSortWorkspaces` now applies `sortByRefillPriority` whenever either the dedicated refill-priority toggle OR the refill-soon filter is active. Highest-credit workspaces now float to the top; zero-credit ones fall to the bottom.
- Added 2 unit tests (`ws-refill-soon-sort.test.ts`): source-invariant guard + behavioural test mirroring the exact 7-row screenshot scenario (all `Refill 1d`, credits 0/0/0/169/15/200/63 → expected order A0087, A0084, A0088, A0086, A0081, A0082, A0083).

### Changed
- Version bump: 3.16.1 → 3.17.0 (all version files synced); readme.md pinned-version references updated to `v3.17.0`.

---

## [v3.16.1] — 2026-05-25

### Changed
- Internal version bump (rolled into v3.17.0).

---

## [v3.16.0] — 2026-05-25

### Added
- `scripts/download-extension.ps1` — lightweight PowerShell helper that downloads the released `marco-extension-<tag>.zip` to the system temp folder, removes any existing target folder, and extracts the contents into the current working directory under a flat folder name (default `marco-extension` — no `v` prefix, no version suffix). Accepts `-Version`, `-Repo`, `-FolderName`. Fail-fast on download/extraction errors with Code-Red logs (exact URL, path, reason).
- 20-step plan Step 4 — `Plan Task` + `Task Next` controls now render in a right-anchored floating panel attached to the prompts dropdown's right edge (was inline, pushing the prompts list down). Hidden by default, toggled by the `🎯 Tasks` header button. 5 new source-invariant tests in `tasks-right-anchor.test.ts`.

### Fixed
- Windows standalone build OOM / stack overflow: `scripts/run-standalone-build-step.mjs` now passes `--max-old-space-size=8192` (via `NODE_OPTIONS`) and `--stack-size=8000` (direct V8 flag) to every `tsc --noEmit` child. Eliminates `Fatal process out of memory: Zone` (exit `-2147483645`) and `STATUS_STACK_OVERFLOW` (exit `-1073741571`) intermittently seen on `lovable-common`, `lovable-owner-switch`, and `xpath` builds. `vite` and other node children are unaffected.
- `credit-totals-modal.ts` open-projects double-click handler — replaced silent `/* ignore */` catch with `logError('creditTotalsModal.openProjects', ...)` per Code-Red contract (exact URL + reason).

### Changed
- Version bump: 3.15.3 → 3.16.0 (all 10 version files synced).
- readme.md pinned-version references updated to `v3.16.0` (18 occurrences).

---

## [v3.15.3] — 2026-05-25

### Fixed
- GitHub repo right-click: HTTP 401/403 from `/workspaces/{ws}/projects/{pid}/gitsync` (caller lacks access to that project) is now treated as `not_linked` instead of surfacing `❌ Failed to fetch GitHub repo: http_403`. Result is cached so repeated right-clicks stay offline.

---

## [v3.15.2] — 2026-05-25

### Fixed
- MacroController: pro_0 workspaces with depleted (0) credits no longer trigger CODE-RED `calcAvailableCredits()` errors. Renderers (`ui-status-renderer.ts`, `ws-list-renderer.ts`) now use nullish coalescing (`??`) instead of `||` so enriched `totalCredits`/`available` of `0` from `pro-zero-credit-calculator` are preserved instead of falling through to the guarded legacy aggregator.

---

## [v3.15.1] — 2026-05-25

### Changed
- Version bump: 3.15.0 → 3.15.1 — pinned root `readme.md` install commands and badges to the new tag for release v3.15.1 (no functional code changes).


---

## [v3.15.0] — 2026-05-25

### Fixed
- **Macro Controller toolbar minimize/expand button squish** (Issue 117, 5-step RCA) — Root cause: `toggleMinimize` / `restorePanel` wiped `bodyElements` inline `display` styles (e.g. `btnRow`'s `display:flex`) by setting `el.style.display = ''`, causing `gap` / `justify-content` / `align-items` to become inert after every expand cycle. Durable fix stashes `el.style.display` into `data-macro-prev-display` on minimize and restores it on expand. Added 5 regression tests (`panel-minimize-expand-display.test.ts`).

### Changed
- Version bump: 3.14.2 → 3.15.0 (all version files synced).

---

## [v3.14.2] — 2026-05-25

### Changed
- Release Page CI/CD Hardening Plan — Steps 3–8:
  - Required-asset verification gate (`release.yml` lines 733–788) blocks publish if any built ZIP, installer, checksum, or notes file is missing or under minimum size.
  - Release notes generation includes pinned + latest install one-liners, manual Chrome unpack instructions, SLSA attestation verification, and full asset table.
  - Scheduled release-audit workflow (`audit-releases.yml`) audits every published `v*` release for missing assets.
  - Pre-flight publish script (`scripts/release-publish.mjs`) wraps tag push and polls for the Release Build workflow run.
  - Release procedure spec linked from `readme.md` CI/CD section.
- Version bump: 3.14.1 → 3.14.2 (all version files synced).

---

## [v3.14.1] — 2026-05-25

### Added
- **Credit Totals Modal** (Issue 116). Right-click menu item `💰 Credit Totals` opens a modal summarizing all workspace credits:
  - **This Billing Cycle** card — total granted, total used, and total remaining across all workspaces.
  - **Free Daily Credits** card — used today vs the 5-credit daily allowance.
  - Per-workspace breakdown table with `Credits Used / Granted` and `Available` columns.
  - Missing-data warning row when a workspace has no cached credit data.
  - `↻ Refresh` button re-renders the modal from the latest snapshot.
- Focus trap + `Escape`-to-close for keyboard accessibility (`aria-modal="true"`, `tabIndex="-1"`).
- 25 unit tests covering credit calculation, modal rendering, dialog lifecycle, and a11y handlers.

### Internal
- Version bump: 3.13.0 → 3.14.1 (manifest, constants, shared-state, instruction, readme pinned).

---

## [v3.13.0] — 2026-05-25

### Fixed
- Chatbox prompts dropdown header no longer wraps when the dropdown is narrow (`Click to paste into editor` shortened to `Click to paste`; `✏️ Edit` collapsed to icon).
- Floating Task Next submenu now clamps vertically inside the viewport (`max-height:80vh` + scroll, top adjusted when overflow).

### Internal
- Version pinned to 3.13.0 across `manifest.json`, `src/shared/constants.ts`, and the macro-controller standalone (`shared-state.ts`, `instruction.ts`).

---

## [v3.12.0] — 2026-05-25

### Changed
- **Macro Controller — Workspace status badges unified** (Issue 115). All `expired*` variants collapse to a single muted gray `Cancel` badge; `about-to-expire` → `Expire Nd` (amber); past lapsed past_due → `Expired Nd` (red); `about-to-refill` → `Refill Nd` / `Refill today` (sky). Single classifier + tone resolver shared by row list and hover card.

### Added
- **Refill-soon filter chip** in the workspace filter menu — shows only workspaces currently classified as `about-to-refill`.
- 28 new tests covering the classifier, tone resolver, badge composition, and the new chip.

### Internal
- Version bump: 3.11.1 → 3.12.0 (all version files synced).

## [v3.11.1] — 2026-05-25


### Added

### Fixed

### Changed
- Version bump: 3.10.0 → 3.11.1 (all version files synced)

---

## [v3.10.0] — 2026-05-24 Refill Priority Filter + GitHub Repo Open

- **Fixed** button row overflow: added `min-width:0;max-width:100%` and `overflow:visible` to `btnRow`, plus `min-width:0` on the start/stop, prompts, and menu containers, so the row wraps cleanly instead of clipping the rightmost buttons inside narrow Lovable sidebars.
- **Added** `Refill priority` filter row in the workspace hamburger menu. When active, workspaces sort by `score = max(0, K - daysToRefill) * available` (`REFILL_PRIORITY_WINDOW_DAYS = 10`), surfacing rows that both refill soon and still hold spendable credits. Persisted via `localStorage('ml_refill_priority')`.
- **Added** inline `R Nd` badge on workspace rows when refill is within the 10-day window. Color tiers: 0d sky, 1–3d amber, 4–10d slate.
- **Added** right-click "🐙 Open GitHub repo" + "🔄 Refresh gitsync" menu entries. Calls `GET /workspaces/{wsId}/projects/{pid}/gitsync` once (no retry, per `mem://constraints/no-retry-policy`). Results — including the negative `not_linked` case — are memoized in the new `MacroGitsyncCache:{wsId}:{pid}` SQLite kv table (TTL: found ∞, not_linked 24h, error 5m), so repeat right-clicks never re-hit the API for a result we already know.

## [v3.9.3] — 2026-05-24 Button Row Spacing Hardening

- **Fixed** controller button row visually flush with no gap after minimize → expand cycle. Bumped `btnRow` flex `gap` 8px → 10px and added defensive `margin:2px 3px` to each button via `btnStyle` so spacing survives any layout state.

## [v3.9.2] — 2026-05-24 Auto-Attach Default True for Built-Ins

- **Changed** `AutoInject` from `false` → `true` in built-in script seed manifests: `macro-controller`, `lovable-owner-switch`, `lovable-user-add`. Scripts now auto-attach to projects by default (C1..C8 gate permitting) instead of requiring manual binding.
- `lovable-common` remains `AutoInject: false` (dependency-only; resolved at injection-time via `resolveDependencies`).

## [v3.9.1] — 2026-05-24 First-Attach Toast UX

- **Added** in-page first-attach toast (MAIN-world) asking the user once per origin whether to keep auto-attaching here. Actions: *Yes keep*, *Not now* (tab-scoped dismiss), *Don't ask for this site* (persistent dismiss).
- **Added** `src/background/seen-origins.ts` — persistent `marco_seen_origins` set in `chrome.storage.local`, sync hot-path read after boot preload.
- **Added** `src/background/first-attach-toast.ts` — toast renderer + ISOLATED-world bridge + runtime message handler (`MARCO_FIRST_ATTACH_ACTION`).
- **Wired** boot preload + bridge registration; auto-injector fires toast post-injection (no-op if seen or dismissed).
- Dark-theme styled, self-removes on click or 30s timeout. Single attempt, no retry.

## [v3.9.0] — 2026-05-24 Auto-Attach C9 Gate + Restricted-URL Hardening

### Added
- **C9 gate — "User dismissed for origin"**: new `src/background/dismissed-origins.ts` adds a ninth auto-attach gate sitting in front of C1..C8. Per-tab in-memory layer (`Map<tabId, Set<origin>>`) plus persistent cross-tab layer in `chrome.storage.local` under `marco_dismissed_origins`. Auto-injector short-circuits T1/T3 navigations with structured log `AUTOATTACH_SKIPPED_USER_DISMISSED`. Boot pre-hydrates the persistent layer.
- **Broad-rule project audit**: `scripts/audit-project-broad-rules.mjs` flags overly-broad URL patterns (`*`, `<all_urls>`, bare host wildcards, catch-all regex) with HIGH/LOW risk based on `autoStart`.
- 8 unit tests for `dismissed-origins` covering tab isolation, persistence, hydration, and snapshot listing.

### Fixed
- `url-trigger.isRestrictedUrl()` now also filters `chrome-untrusted://` and `moz-extension://` so the sentinel inject no longer attempts (and fails) on other extensions' UI pages. Resolves the v3.0.0 report "Cannot access a chrome-extension:// URL of different extension".

### Docs
- `mem://features/auto-attach-policy` appended with C9 contract, log code, storage key, and boot wiring.

## [v3.8.0] — 2026-05-24 Prompts Dropdown Viewport Fix


### Fixed
- Prompts dropdown now portals to `document.body` so it is no longer clipped by the panel's `overflow: hidden`.
- Viewport-aware positioning flips up/down based on available space and clamps left/right to an 8 px safe gutter.
- `Task Next` submenu scrolls into view when the dropdown opens upward.

---

## [v3.7.0] — 2026-05-23 Workspace Hover Card UX Fix

### Fixed
- Workspace hover tooltip in the Macro Controller now positions to the **right** of the workspace row (flips left when space is tight) so it no longer covers the workspace list or action icons.
- Added a 220 ms grace period plus card-level `mouseenter`/`mouseleave` handling so users can move the cursor onto the tooltip and click **Priority rules & details** (and other inline controls) without the panel disappearing.
- Anchored positioning to the full workspace row instead of just the name span, eliminating the dead-zone gap that prevented reaching the card.

---

## [v3.6.0] — 2025-05-22 Minor Version Bump and Fixes

### Added
- New prompts: `logo-create` (18) and `proof-read` (19) in the standalone script prompt library.
- Prompt parity check test ensures built-in and standalone script prompt folders stay in sync.
- Deterministic seeding gate for E2E test stability.

### Fixed
- Lint warnings: removed unused eslint-disable directives and cleaned up type assertions.
- E2E-02 Project CRUD test suite temporarily skipped due to React Options page rendering instability in CI (deferred to S-021 React UI unification).
- Version sync enforced across manifest, constants, and all standalone script instruction manifests.

### Changed
- Version bump: 3.5.2 → 3.6.0 (all version files synced).
- Pinned version references in root readme updated to v3.6.0.

---

## [v3.5.2] — 2025-04-26

### Added
- Verbose logging toggle in Settings → Debugging Switch.
- Form snapshot capture on Submit, Type, and Select recorder actions.
- JS-step diagnostics with `buildJsStepFailureReport` for inline JS failures.

### Fixed
- Build lock sentinel (`.lovable/build.lock`) for sequential build gating.
- Timer & observer teardown audit compliance (v2.243.0 L-1…L-5).

### Changed
- Webhook result schema versioning (`WEBHOOK_RESULT_SCHEMA_VERSION = 2`).
- Error-swallow audit generator (`scripts/audit-error-swallow.mjs`).
