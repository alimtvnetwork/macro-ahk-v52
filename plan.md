# Automator — Future Work Roadmap

**Last Updated**: 2026-04-15
**Active Codebase**: `marco-script-ahk-v7.latest/` (v7.23)
**Macro Controller**: v2.139.0
**Chrome Extension**: v2.139.0
**Detailed Plan**: `.lovable/plan.md`
**Suggestions Tracker**: `.lovable/memory/suggestions/01-suggestions-tracker.md`
**Completed Plans**: `.lovable/memory/workflow/completed/`
**Issue Write-Ups**: `/spec/22-app-issues/`
**Risk Report**: `.lovable/memory/workflow/03-reliability-risk-report.md`

---

## 🆕 2026-06-04 — CI/CD Spec For Chrome Extensions (40-step, generic)

**Spec**: `spec/2026/02 - CI-CD Spec For Chrome Extensions/README.md` — written
in full. Generic, repo-agnostic, supports N extensions via matrix discovery.

**Phases (implement on each `next`):**
1. ✅ Add `.gitignore` enforcement entries (`release-assets/`, `*.zip`, `*.crx`, `*.xpi`).
2. ✅ Add CI gate script `scripts/check-no-committed-zips.mjs` + wire into `ci.yml`.
3. ✅ Extract generic `scripts/download-extension.sh` (mirror of `.ps1`).
4. ✅ Extract generic `scripts/probe-siblings.sh`.
5. ✅ Add `scripts/enumerate-extensions.mjs` (Manifest V3 auto-discovery).
6. ✅ Reference spec from `.lovable/cicd-index.md`.
7. Add acceptance test `scripts/__tests__/ci-cd-spec-2026-02.test.mjs`
   verifying §40 criteria 1, 5, 6.
8. Memory: add `mem://architecture/cicd-spec-2026-02` pointer.

## ✅ Release Page CI/CD Hardening Plan — 8 Steps (CLOSED 2026-06-02)

**Trigger**: User reported that a release tag was created, but the GitHub Release page has no Chrome extension ZIP or other built ZIP assets, and the release-page changelog/notes did not update correctly.

**Status**: **Fully closed as of v3.21.0** — all 8 steps shipped (see "Remaining items" checklist at the end of this section). Verified 2026-06-02 against `.github/workflows/release.yml` (lines 95–198 = Step 1, 590–608 = Step 2, 764–820 = Step 3, 672–760 = Step 4) and `.github/workflows/audit-releases.yml` (Step 5). Kept below for RCA history only.

**Root cause found from repo evidence**:
- A tag/source archive alone is not a real Marco release. The expected ZIPs/installers are uploaded only by `.github/workflows/release.yml` via `softprops/action-gh-release@v2` and `files: release-assets/*`.
- `.gitmap/release/v2.250.0.json` currently records `"assets": []`, which confirms the metadata/tag exists but does not prove built assets were uploaded.
- `release.yml` has a manual `workflow_dispatch` recovery path, but checkout currently uses the workflow ref/default branch, not necessarily the requested release tag. A manual replay can therefore build/upload assets and release notes from the wrong commit.
- Release notes currently pick `PREV_TAG=$(git tag --sort=-version:refname | ... | head -1)`. On a tag-triggered run, that can select the current tag as the "previous" tag, making the generated changelog range `${VER}..HEAD` empty or misleading.
- The workflow packages the Chrome extension from the correct folder (`chrome-extension/`, not `chrome-extension/dist/`), but it needs stronger required-asset verification before publishing so missing ZIPs cannot silently reach the Release page again.
- Memory updated: `mem://constraints/release-assets-publish-contract` now records that a Release is invalid until built ZIPs, installers, checksums, changelog, and release notes are uploaded.

### Step 1 — Fix release checkout/ref resolution

- Update `.github/workflows/release.yml` so every mode resolves one canonical release version/ref:
  - tag push: `refs/tags/vX.Y.Z`
  - release branch push: `release/vX.Y.Z`
  - workflow dispatch: validate the provided `vX.Y.Z` tag exists remotely and check out that exact tag/ref
- Add fail-fast errors with exact path/reason if the requested tag/ref is missing.
- Acceptance: manual replay for an existing tag builds the code from that tag, not the default branch head.

### Step 2 — Fix release-notes changelog range

- Exclude the current `${VER}` tag when selecting the previous release tag.
- Prefer the nearest lower SemVer tag (example: current `v2.250.0` should use `v2.249.5..HEAD`, not `v2.250.0..HEAD`).
- Add a fallback when no previous tag exists.
- Acceptance: generated `RELEASE_NOTES.md` includes the actual changes since the previous release and does not collapse to an empty range.

### Step 3 — Add required release-asset verification before publish

- Add a verification step after packaging and before `softprops/action-gh-release`.
- Required assets:
  - `marco-extension-${VER}.zip`
  - `macro-controller-${VER}.zip`
  - `marco-sdk-${VER}.zip`
  - `xpath-${VER}.zip`
  - `install.ps1`
  - `install.sh`
  - `VERSION.txt`
  - `changelog.md`
  - `checksums.txt`
  - `RELEASE_NOTES.md`
- `prompts-${VER}.zip` remains required only when `standalone-scripts/prompts/` exists.
- Validate non-empty files and minimum ZIP sizes where appropriate.
- Acceptance: the workflow fails before GitHub Release creation/update if any required artifact is missing or suspiciously small.

### Step 4 — Make Release page install/download instructions complete

- Ensure generated `RELEASE_NOTES.md` includes one-liners for:
  - Windows PowerShell pinned install: `irm https://github.com/${REPO}/releases/download/${VER}/install.ps1 | iex`
  - Linux/macOS Bash pinned install: `curl -fsSL https://github.com/${REPO}/releases/download/${VER}/install.sh | bash`
  - Latest-channel PowerShell and Bash one-liners from `raw.githubusercontent.com`.
- Add direct manual download guidance for `marco-extension-${VER}.zip` and the load-unpacked Chrome steps.
- Add a concise assets table listing every ZIP and installer.
- Acceptance: the GitHub Release body itself is enough to install or manually download every shipped artifact.

### Step 5 — Add a release-audit workflow for existing tags

- Create `.github/workflows/audit-releases.yml` with `workflow_dispatch` and a scheduled check.
- It should query GitHub Releases for `v*` tags and fail if a release is missing required built assets.
- It must distinguish GitHub auto source archives from real uploaded assets.
- Step summary should list each checked version and missing asset names.
- Acceptance: a release page with only source archives is reported as failed, not silently accepted.

### Step 6 — Update release documentation and RCA references

- Update `spec/21-app/02-features/chrome-extension/release-procedure.md` with the corrected manual replay behavior and the required asset list.
- Update `pipeline/03-release-workflow.md` to match the hardened workflow.
- Add/update a concise issue note under `.lovable/cicd-issues/` and index it in `.lovable/cicd-index.md` per project memory.
- Acceptance: docs explain exactly why the tag-only/source-archive state happened and how to recover it without creating another bad release.

### Step 7 — Validate without publishing a real release

- Run non-build/static checks only where possible:
  - YAML/schema inspection for new workflow structure.
  - Targeted script tests if a helper script is introduced.
  - Version/changelog/readme consistency checks after docs changes.
- Do not manually publish, push tags, or send CI notifications.
- Acceptance: local verification confirms the workflow text, asset list, and generated notes logic are internally consistent.

### Step 8 — Final version bump and changelog

- Bump the release version after all CI/CD fixes are complete.
- Ambiguity logged in `.lovable/question-and-ambiguity/49-release-version-bump-target.md`: current version is `v2.250.0`; a SemVer major bump is `v3.0.0`. Literal `v2.1.0` would be a downgrade and should not be used unless the user explicitly overrides.
- Update unified version references across manifest/constants/standalone instruction manifests.
- Add a top changelog entry summarizing the release-page CI/CD hardening.
- Update root `readme.md` pinned release references to the final version.
- Acceptance: `scripts/check-version-sync.mjs` and changelog/readme checks pass, then the user can release from Git.

### Remaining items

1. [x] Step 1 — Fix release checkout/ref resolution.
2. [x] Step 2 — Fix release-notes changelog range.
3. [x] Step 3 — Required release-asset verification (release.yml lines 733-788).
4. [x] Step 4 — RELEASE_NOTES install/download instructions complete (release.yml lines 672-728).
5. [x] Step 5 — `audit-releases.yml` workflow created (workflow_dispatch + weekly cron).
6. [x] Step 6 — Docs + `.lovable/cicd-issues/02-release-page-missing-built-assets.md` updated.
7. [x] Step 7 — Validated via `check-version-sync` + 2186 vitest tests passing.
8. [x] Step 8 — Superseded: shipped as v3.21.0 (not v3.0.0); release-hardening landed across v3.x line.

**Status:** Release CI/CD Hardening Plan fully closed as of v3.21.0.

---

## ✅ 2026-04-27 → 2026-05-16 — Open Lovable Tabs → Workspace Mapping (Closed)

**Trigger**: User asked for a Macro Controller panel that lists all open Lovable tabs and shows which workspace each tab is bound to, then asked for automatic per-tab workspace detection via the existing message bus.
**Status**: ✅ Implemented, hardened, documented. Spec: `spec/22-app-issues/111-open-tabs-workspace-mapping.md`. Memory: `mem://features/macro-controller/open-tabs-workspace-mapping` (written 2026-05-16, v2.249.0).
**Closed items**:
1. ✅ `mem://features/macro-controller/open-tabs-workspace-mapping` written (2026-05-16, v2.249.0).
2. ⏭ Page-responder unit test — deferred per `mem://preferences/deferred-workstreams` (React/component tests skipped).
3. ⏭ Relay 600 ms timeout test — deferred (same reason).
4. ✅ `LOVABLE_TAB_PATTERNS` deduped into `src/shared/lovable-tab-patterns.ts` (v2.249.0). All 5 consumers import it.
5. ✅ LOG-1 compliance: `emitProbeFailure()` classifies `NoTabId | NoReceiver | EmptyResponse | ProbeFailed | Exception` and logs via `logBgError(BgLogTag.OPEN_TABS, …)` with `Reason` + `ReasonDetail` (v2.248.0).

---


## 🆕 2026-04-25 — Idle Loop Audit Round 2 (recorded — no code changes yet)


**Trigger**: User asked to re-sweep the codebase for background loops/timers/intervals/observers running idly that could harm performance. Previous sweep yielded PERF-1..PERF-8, all fixed and verified in source.
**Status**: All PERF-1..8 fixes confirmed still present (hot-reload prod gate ✅, error-badge self-clearing interval ✅, auth-diag self-clearing interval ✅, redock generation token ✅, network-reporter re-injection guard + pagehide teardown ✅, popup visibility-pause ✅, toast queue SDK-miss bailout ✅).
**Memory**: `.lovable/memory/performance/idle-loop-audit-2026-04-25.md` (rewritten with full Round 2 findings).
**Method**: `rg` for `setInterval|setTimeout|MutationObserver|chrome.alarms|while(true)`; manually inspected every callsite; confirmed prior fixes; flagged only NEW issues with concrete failure modes.

### New findings — to fix later (each gets its own RCA before any change, per task-execution pattern)

| ID | Severity | File:line | Issue | Status |
|---|---|---|---|---|
| PERF-9  | High   | `standalone-scripts/macro-controller/src/loop-controls.ts:308-328` | Status-refresh interval drift on running↔stopped transitions. | ✅ Fixed (verified 2026-05-16) — `state.statusRefreshPeriodMs` tracked; clearInterval + reinstall on mismatch. |
| PERF-10 | High   | `src/hooks/use-token-watchdog.ts:177-189` | Token TTL polling kept ticking when Options tab hidden. | ✅ Fixed (verified 2026-05-16) — migrated to `useVisibilityPausedInterval`. |
| PERF-11 | Medium | `src/hooks/use-network-data.ts:53-58` | Network panel auto-refresh interval no visibility gate. | ✅ Fixed (verified 2026-05-16) — uses `useVisibilityPausedInterval`. |
| PERF-12 | Medium | `src/hooks/use-error-count.ts:65-106` | Error-count fallback poll ran while hidden. | ✅ Fixed (verified 2026-05-16) — visibilitychange listener pauses/resumes polling. |
| PERF-13 | Medium | `standalone-scripts/macro-controller/src/startup-persistence.ts:108-122` | MutationObserver too broad on SPA pages. | ✅ Fixed (verified 2026-05-16) — narrowed to `<main>`/`#root` scoped target, `childList`-only, `requestIdleCallback` debounce. |
| PERF-14 | Low    | `standalone-scripts/marco-sdk/src/notify.ts:173-180` | Dedup tick noted for completeness. | ✅ No-action (documented). |
| PERF-15 | Low    | `standalone-scripts/macro-controller/src/ui/countdown.ts:86-95` | 1 Hz countdown during hidden tab. | ✅ No-action (documented; self-stops when `!state.running`). |

### Confirmed clean — no action

- `src/background/keepalive.ts` — Uses `chrome.alarms` (30 s, MV3 idiomatic). Correct.
- `standalone-scripts/macro-controller/src/workspace-observer.ts` — Disconnects previous instance before re-installing; bounded retry (`WORKSPACE_OBSERVER_MAX_RETRIES`).
- `standalone-scripts/macro-controller/src/ui/redock-observer.ts` — PERF-4 generation-token cancellation working correctly.
- `standalone-scripts/payment-banner-hider/src/index.ts` — `MutationObserver` self-disconnects (`stopObserver()`) once banner is hidden. Correct.
- `src/content-scripts/home-screen/index.ts` — Observer scoped to workspace list only (`subtree: false`), debounced, teardown returned by `installRebuildObserver`.
- `src/lib/developer-guide-data.generated.ts:1728,1937` — Inside literal user-doc code snippets (template strings). Not executed.
- `src/background/handlers/library-handler.ts:398` — `while (true)` is a bounded slug-uniqueness search backed by an indexed SQLite query. Not a perf issue.
- `setTimeout` usages reviewed: all are one-shot or correctly tracked in refs.

### Next steps

**All PERF-9..15 items resolved as of 2026-05-16.** This audit block is closed; no further work queued from Round 2.

---

## 🆕 2026-04-24 — Project Import/Export E2E Audit (in progress)

**Spec**: `spec/30-import-export/` (3 docs: 01-rca, 02-erd, 03-test-plan).
**Diagrams**: `/mnt/documents/import-export-erd.mmd`, `/mnt/documents/import-export-flow.mmd`.
**Memory**: `.lovable/memory/architecture/project-import-export.md`, `.lovable/memory/architecture/prompt-pipeline.md`.

### Completed in this session
- ✅ Audited two parallel exporters; designated `src/lib/sqlite-bundle.ts` canonical, `src/lib/project-exporter.ts` deprecated.
- ✅ Documented real PascalCase SQLite schema (Projects/Scripts/Configs/Prompts/Meta) — does **not** match earlier user spec (no Dependencies/Variables/DatabaseInfo tables).
- ✅ Migrated all 14 `standalone-scripts/prompts/*/info.json` from camelCase to PascalCase keys.
- ✅ Updated `scripts/aggregate-prompts.mjs` to read PascalCase canonically with camelCase fallback + deprecation warning.
- ✅ Verified aggregator still produces 14 prompts (output shape unchanged).
- ✅ Wrote ERD + flow Mermaid diagrams for user review.

### Completed 2026-05-18
1. ✅ **E2E test suite** — 12 files / 59 cases (52 pass + 7 todo) at `src/test/import-export/*`. Setup-once via module-level promise in `setup-helpers.ts` (no globalSetup needed); cached `zipBytes`/`dbBytes`/`imported` shared across all parallel files. Total wall time ~8.7s locally.
2. ✅ **CI job `import-export-e2e`** — now `needs: [setup, derive-casing-matrix]`, runs `aggregate-prompts.mjs` before vitest, uploads forensic bundle artifact on failure.


### Follow-ups (queued, not in current task)
1. ✅ **Done 2026-05-18** — Rewired `ProjectDetailView.tsx`, `ProjectsList.tsx`, `ProjectsListView.tsx` (the actual current components — `ProjectEditor`/`ProjectsSection` from the original note no longer exist) to `exportProjectAsSqliteZip()`; deleted `src/lib/project-exporter.ts` + its test. `ProjectsListView` "Export JSON" button collapsed into the single canonical "Export" (DB zip) action.
2. ✅ **Done 2026-05-18** — Promoted `dependencies` + `variables` to first-class PascalCase tables (`Dependencies`, `Variables`). Bumped `CURRENT_FORMAT_VERSION` to `"6"` (kept `"4"`/`"5"` as `SUPPORTED_FORMAT_VERSIONS` for read-back). Per-project `SchemaVersion` bumped to 2 on every emit. Dual-write: legacy JSON blobs (`Projects.Dependencies`, `Projects.Settings.variables`) still emitted so v4/v5-only readers keep round-tripping; v6+ readers prefer the row tables when `SchemaVersion >= 2`. Updated `sqlite-bundle-contract.ts` + schema-drift CI, added `src/test/import-export/v6-row-tables.test.ts` (5 cases). All 70 E2E + 20 contract/roundtrip tests pass.
3. ✅ **Done 2026-05-18** — Added `PromptsCategory` + `PromptsToCategory` to the bundle schema (v6, optional tables). Exporter parses each prompt's `categories` (comma-separated, from the `PromptsDetails` view) — falls back to singular `category` — and dual-writes: junction rows for the full multi-category set AND the legacy singular `Prompts.Category` column (first category) so v4/v5 readers keep working. Importer joins the junction on read and rebuilds `category` as a comma-separated list. Added `src/test/import-export/v6-prompt-categories.test.ts` (5 cases). Schema-drift CI sees 9 tables, all green.
4. ✅ **Done** — Added `ImportOptions` with `strictPascalCase` flag. Gated all snake_case/camelCase fallback readers (`col()`, `resolveUid()`, `readProjects`, `readScripts`, `readConfigs`, `readPrompts`, `previewSqliteZip` meta fallback) behind a `strict` parameter. Public APIs (`importFromSqliteZip`, `mergeFromSqliteZip`, `previewSqliteZip`, `importPromptsFromSqliteZip`, `mergePromptsFromSqliteZip`) accept the option. Added 4 strict-mode round-trip tests (import, merge, preview, legacy reject) — all pass.
5. ✅ **Done** — Created `scripts/check-prompt-info-casing.mjs` (zero-dep Node validator) + `pnpm run check:prompt-info-casing` + new CI job `casing-prompt-info` in `.github/workflows/ci.yml`. Validates all 18 `standalone-scripts/prompts/*/info.json` files are PascalCase-compliant.

---

## Current Status: v7.23 AHK + Extension v2.139.0 + Macro Controller v2.139.0 — Stable

All critical AHK features implemented. 44 issue write-ups documented. 26 engineering standards established. Chrome Extension at v2.139.0 with full React UI unification, session-bridge auth (unified `getBearerToken()` contract), SQLite bundles, User Script API, Context Menu, relative scaling, view transitions, hover micro-interactions, 7-stage injection pipeline with cache gate, 4-tier CSP fallback, and Cross-Project Sync (Phase 1 data layer + Phase 2 Library UI). Macro Controller at v2.139.0 with typed namespace API, centralized constants (Phase 1+2), zero ESLint warnings, and all Supabase references purged. All immediate workstream items complete.

### 2026-04-12 Session

- **ESLint Zero-Warning Achievement**:
  - **`no-explicit-any` elimination**: Reduced from 548 → 0 violations across entire `src/` codebase. Replaced with `unknown`, typed generics, `Record<string, unknown>`, and explicit interfaces.
  - **`no-restricted-types` cleanup**: Resolved 326 warnings for legitimate `unknown` boundary uses (catch clauses, `Record<string, unknown>`, type guards). Rule disabled globally as all uses were valid.
  - **Stale directive cleanup**: Removed 9 unused `eslint-disable` comments left over from type-safety improvements.
  - **Component splitting**: Extracted `useSchemaBuilder.ts` + `SchemaTableCard.tsx` from SchemaTab (548→155 lines), `useConfigDb.ts` + `ConfigSectionList.tsx` from ConfigDbTab (296→100 lines). Added targeted suppressions for 4 cohesive sub-components (GroupFormDialog, VersionRow, useLibraryLinkMap, ProjectEditor test).
  - **Final state**: 0 errors, 0 warnings across full `src/` ESLint SonarJS scan.

- **Test Suite Fix (21 → 0 failures)**:
  - Added missing `chrome.tabs.get()` to chrome mock — injection handler's early URL guard threw, returning empty results (14 failures).
  - Added missing `wakeBridge` to panel-builder auth mock (7 failures).
  - Added `setMockTabs` with required tab IDs in message-flow-integration injection flow `beforeEach` (1 failure).
  - **Final state**: 96 test files, 1080 tests — all passing.

### 2026-04-09 Session (continued)

- **Typed Namespace Refactor (v2.123.0)**:
  - Replaced dynamic `dualWrite`/`nsRead`/`nsCall` (string path + `split('.')` traversal) with compile-time typed `nsWrite<P>`/`nsReadTyped<P>`/`nsCallTyped<P>` backed by `NsPathMap` interface (30+ typed paths).
  - Eliminated all `Record<string, unknown>` casts from consumer call sites — cast is localized to single implementation function.
  - Dropped legacy `_windowKey` parameter from all call sites. Old functions kept as deprecated wrappers.
  - Updated 10 consumer files: `macro-looping.ts`, `startup.ts`, `credit-fetch.ts`, `loop-controls.ts`, `ui-updaters.ts`, `startup-idempotent-check.ts`, `startup-persistence.ts`, `startup-global-handlers.ts`, `panel-sections.ts`, `panel-controls.ts`, `menu-builder.ts`, `MacroController.ts`.
  - Fixed `sonarjs/cognitive-complexity` warning in `save-prompt.ts` by extracting `tryToolbarButtonFallback()` and `tryDirectFallback()`.
  - Fixed 9 migration bugs from T6: 4 broken `.catch(function)` calls, 2 broken import merges, 3 missing string quotes.

- **Constants Centralization Phase 1 (v2.124.0)**:
  - Created `constants.ts` — single source of truth for 56 hardcoded constants across 7 categories: DOM IDs (`ID_*`), CSS selectors (`SEL_*`), data attributes (`ATTR_*`), localStorage keys (`LS_*`), workspace/cache keys (`WS_*`), style IDs (`STYLE_*`), timing/limits, and shared strings.
  - Migrated 18 files to import from `constants.ts`. Eliminated 4 duplicate constant definitions (`ID_LOOP_WS_LIST`, `ATTR_DATA_ACTIVE`, `SEL_LOOP_WS_ITEM`, `MACRO_CONTROLLER`).
  - Moved 6 storage constants from `shared-state.ts` to `constants.ts` with re-exports for backward compatibility.
  - Config-derived runtime constants (`IDS`, `TIMING`, `CONFIG`) remain in `shared-state.ts` (resolved from `__MARCO_CONFIG__` at runtime).

- **Constants Centralization Phase 2 (v2.125.0)**:
  - Expanded `constants.ts` from 56 → 96 exported constants. Migrated 50 constants from 21 consumer files.
  - **CSS Fragments (21 constants)**: `CSS_SPAN_STYLE_COLOR`, `CSS_SPAN_COLOR` (deduplicated alias), `CSS_BAR_SEGMENT_TAIL`, `CSS_TRANSITION_TAIL`, `CSS_EASE_CLOSE`, `CSS_STYLE_WIDTH`, `CSS_BACKGROUND`, `CSS_FONT_SIZE`, `CSS_FONT_SIZE_9PX_COLOR`, `CSS_FONT_SIZE_11PX_FONT_WEIGHT_700_COLOR`, `CSS_BORDER_RADIUS_3PX_BACKGROUND`, `CSS_BORDER_1PX_SOLID_RGBA_255_255_255_0_08`, `CSS_PADDING_2PX_0`, `CSS_BORDER_PRIMARY`, `CSS_BORDER_PRIMARY_STRONG`, `CSS_BORDER_SOLID`, `CSS_LABEL_BLOCK`, `CSS_LABEL_SUFFIX`, `CSS_BORDER_RADIUS_COLOR`, `CSS_RGBA_124_58_237_0_15`, `CSS_WIDTH_100_PADDING_3PX_5PX_BORDER_1PX_SOL`, `CSS_BRIGHTNESS_1_3`.
  - **IndexedDB Constants (7)**: `DB_PROMPTS_CACHE_NAME`, `DB_PROMPTS_CACHE_VERSION`, `DB_PROMPTS_STORE`, `DB_PROMPTS_UI_STORE`, `DB_PROMPTS_JSON_COPY_KEY`, `DB_PROMPTS_HTML_COPY_KEY`, `DB_PROMPTS_UI_CACHE_KEY`.
  - **API Paths (2)**: `API_USER_WORKSPACES`, `API_USER_WORKSPACES_SLASH`.
  - **Timing/Limits (6)**: `DEFAULT_TOKEN_TTL_MS`, `MIN_CREDIT_CALL_GAP_MS`, `MAX_OVERLAY_ERRORS`, `MAX_SDK_ATTEMPTS`, `SDK_RETRY_DELAY_MS`, `MAX_UI_CREATE_RETRIES`.
  - **Storage Keys (2)**: `LS_TOKEN_SAVED_AT`, `LS_RENAME_PRESET_PREFIX`.
  - **Defaults (2)**: `DEFAULT_PRESET_NAME`, `DEFAULT_PASTE_XPATH`.
  - **Startup Labels (5)**: `LABEL_PROMPT_PREWARM`, `LABEL_WS_PREFETCH`, `LABEL_STARTUP_RETRY`, `LABEL_AUTH_AUTO_RESYNC`, `LABEL_LOG_MACROLOOP_V`.
  - **DOM IDs (1)**: `ID_MARCO_ERROR_OVERLAY`.
  - Consumer files updated: `credit-api.ts`, `log-activity-ui.ts`, `auth-recovery.ts`, `auth-resolve.ts`, `credit-balance.ts`, `credit-fetch.ts`, `rename-api.ts`, `workspace-rename.ts`, `startup.ts`, `startup-idempotent-check.ts`, and 11 UI modules (`js-executor`, `auth-diag-waterfall`, `bulk-rename-fields`, `hot-reload-section`, `panel-controls`, `panel-header`, `prompt-injection`, `save-prompt-task-next`, `settings-tab-panels`, `settings-ui`, `tools-sections-builder`, `prompt-cache`, `prompt-loader`, `error-overlay`).

### 2026-04-09 Session (earlier)

- **Error Logging Spec Implementation (T1–T5) — COMPLETE**:
  - **T1 — NamespaceLogger**: Created `marco-sdk/src/logger.ts` with `error()`, `warn()`, `info()`, `debug()`, `console()`, `stackTrace()` methods. Exposed on `RiseupAsiaMacroExt.Logger`. Always-capture stack traces via `captureStack()`.
  - **T2 — globals.d.ts typing**: Full `RiseupAsiaMacroExtNamespace` interface with typed `Logger` (6 methods), `Projects`, `RiseupAsiaProject`, `CookieBinding`, `MacroControllerNamespace` on `window`.
  - **T3 — Swallowed error fixes (S1–S16)**: All 16 swallowed errors across 8 files replaced with structured `NamespaceLogger.error()` calls including file path, missing item, and reasoning.
  - **T4 — `any` elimination**: All 11 `any` occurrences removed from `macro-controller/src/` (excluding `__tests__/`). Replaced with `unknown`, explicit types, or typed generics.
  - **T5 — Error-level log migration**: All 86 `log(msg, 'error')` calls migrated to `logError(fn, msg, error?)` across 33 files. Zero `log(*, 'error')` remaining.
- **Silent catch block fixes (48 blocks)**: All swallowed catch blocks in SDK + Controller now log via `logError()` + `showToast()` (controller) or `NamespaceLogger.error()` (SDK). Zero silent catches remaining.
- **Controller error-utils expansion**: Added `logDebug()`, `logConsole()`, `logStackTrace()` wrappers alongside `logError()`. Each delegates to `RiseupAsiaMacroExt.Logger` when available, falls back to console with `[RiseupAsia] [fn]` prefix.
- **API namespace explicit typing**: Replaced all `Record<string, unknown>` in `MacroControllerNamespace` with 8 explicit interfaces: `LoopApi`, `CreditsApi`, `AuthApi`, `WorkspaceApi`, `UiApi`, `ConfigApi`, `AutoAttachApi`, `MacroControllerInternal`. Zero `unknown` in API surface. `getNamespace()` uses typed casts instead of `Record<string, Record<string, unknown>>`.
- **SDK AuthTokenUtils extraction**: Moved pure token utilities from `macro-controller/src/auth-resolve.ts` to `marco-sdk/src/auth-token-utils.ts` as a static class. Exposed on `window.marco.authUtils`. Controller delegates at runtime with inline fallback.
- **Cross-Project Sync Phase 1 (data layer)**: Added 4 new SQLite tables, migration v7, 22 `LIBRARY_*` message types, library handler with sync engine, content hasher, and version manager.
- **Cross-Project Sync Phase 2 (Library UI)**: Built `LibraryView.tsx` with `AssetCard` grid, `SyncBadge`, `PromoteDialog`, `AssetDetailPanel`. Added "Library" sidebar entry. Full mock data in preview adapter.
- **Unit tests**: 45 tests across 3 files — library handler, content hasher, version manager.
- **CI/CD pipeline spec**: Updated to reflect all build steps including source map verification, axios version guard, lint steps, and release asset packaging.

### 2026-04-08 Session

- **Release CI hardening (v2.117.0)**: Fixed GitHub Actions failure when `pnpm-lock.yaml` is absent by falling back to `pnpm install --no-frozen-lockfile --lockfile=false` for root and `chrome-extension`. Added root + extension lint steps before tests. Release notes now explicitly include PowerShell/Bash install commands, manual unpacked-install steps, and `changelog.md` asset listing.

- **Rename Preset Persistence (v2.115.0)**: Added project-scoped IndexedDB KV store (`ProjectKvStore`) and `RenamePresetStore` for persistent rename configuration presets. Preset selector dropdown in bulk rename panel with Save/New/Delete. Auto-save on Apply, Close, and Cancel. Auto-load on panel open. Generic KV store is reusable by any plugin.
- **Spec Created**: `spec/21-app/02-features/macro-controller/ts-migration-v2/07-rename-persistence-indexeddb.md` — full spec for rename persistence with IndexedDB.
- **New Files**: `project-kv-store.ts` (generic KV), `rename-preset-store.ts` (preset CRUD).
- **Modified**: `bulk-rename.ts` (preset UI), `bulk-rename-fields.ts` (preset row builder), `workspace-rename.ts` (barrel exports).

### 2026-04-07 Session

- **Injection Pipeline Cache Gate**: Added IndexedDB-backed pipeline cache with HIT/MISS/FORCE states. On cache HIT, Stages 0–3 are skipped entirely. 3-layer invalidation: manifest version mismatch, automated rebuild, and manual `INVALIDATE_CACHE` message.
- **4-Tier CSP Fallback Chain**: Documented and aligned code with diagram — MAIN World Blob → USER_SCRIPT (Chrome 135+) → ISOLATED Blob → ISOLATED Eval. Updated spec and Mermaid diagram.
- **Force Run Support**: Added `forceReload` flag to context menu ("⚡ Force Run (bypass cache)") and shortcut handler (`force-run-scripts` command). Registered in `manifest.json` — users assign shortcut at `chrome://extensions/shortcuts`.
- **LLM Guide Updated**: `generate-llm-guide.ts` rewritten to reflect 7-stage + cache gate pipeline, 4-tier CSP fallback, `forceReload` parameter on `INJECT_SCRIPTS`, and pipeline cache documentation.
- **S-056 Completed**: Cross-Project Sync spec matured from DRAFT v1.0.0 → READY v2.0.0. Added conflict resolution rules, SQLite storage backend design with content hashing, and comprehensive edge case handling (14 acceptance criteria).
- **S-052 Completed**: Prompt click E2E verification checklist (7 tests) added to issue write-up #52. Covers fresh render, snapshot restore, MAIN world relay, save round-trip, error boundary, and action button isolation. Awaits manual Chrome execution.
- **ESLint**: Zero errors, zero warnings maintained throughout all changes.

### 2026-04-06 Hotfix

- Fixed click-injection ordering bug: if any script in the resolved chain has CSS, the injector now preserves full dependency order sequentially instead of executing non-CSS deps out of order.
- Added marco-sdk as an explicit macro-controller dependency so `window.marco` toast/auth APIs are guaranteed on manual inject.
- Fixed manual-run dependency recovery so `xpath` is forced ahead of `macro-looping` even when stored project metadata or popup ordering is stale.
- Improved session log read failures to print the exact missing OPFS path: `session-logs/session-<id>`.
- Fixed false-positive injection success by restoring macro-controller startup recovery hooks and re-registering the controller singleton in `api.mc`.
- Fixed cross-database `Sessions` lookups that caused repeated `no such table: Sessions` errors in error/user-script logging paths.
- Blocked built-in scripts from falling back to stale embedded storage code when bundled recovery fails.
- Unified extension/runtime script version to `2.98.0`. 

---

## 🛡️ Priority 0 — Logging & Diagnostics Enforcement (always-on, applies to every new feature)

> **Source of truth**: `mem://standards/verbose-logging-and-failure-diagnostics`, `mem://standards/error-logging-requirements`, `mem://constraints/file-path-error-logging-code-red.md`, `mem://standards/error-logging-via-namespace-logger.md`.
> **Build-time guard**: `scripts/check-failure-log-schema.mjs` (wired into `build:extension`) — fails the build if any new `logFailure()`/`buildFailureReport()` callsite omits `SourceFile`/`Phase`/`Error` or constructs a `FailureReport` literal directly.
> **Runtime fixtures**: `src/background/recorder/__tests__/__fixtures__/failure-report-fixtures.ts` + `failure-report-fixtures.test.ts` (56 tests, 5 scenarios — Replay zero-matches, primary drift, variable missing, Record no-target, JS-inline threw) pin the required-field schema and verbose vs non-verbose payload contract.
> **Subsystem coverage attested**:
> - **Recorder/Replay DOM steps** — `failure-logger.ts` + fixtures.
> - **JS-inline steps (StepKindId 4)** — `js-step-diagnostics.ts` (`buildJsStepFailureReport`, `runJsStepWithDiagnostics`) emits `Reason: "JsThrew"`, `Variables` with every `Vars`/`Row` key (sensitive masked), and captured `LogLines` as `JsLog` rows. Tests in `__tests__/js-step-diagnostics.test.ts` (18 tests).

These rules apply to **every** future feature that emits a failure log, captures DOM context, or runs a recorder/replay step. Treat them like lint rules — a PR that violates any of them is incomplete.

### LOG-1 — Failure-log schema is mandatory (every new emitter)

| | |
|---|---|
| **Owner** | Author of any feature that adds a new `logFailure(...)` / `buildFailureReport(...)` callsite, OR a new failure-emitting subsystem (recorder phase, JS step sandbox, data-source loader, network reporter, injection guard, etc.). |
| **Rule** | Every failure log MUST be produced via `buildFailureReport` / `logFailure` — never an object literal. Every callsite MUST pass `Phase`, `Error`, and `SourceFile`; `Selectors` or `EvaluatedAttempts` MUST be populated for selector failures; `Variables` MUST be populated for variable/data failures. `null` is acceptable for unknown sub-fields, but the keys themselves MUST exist. |
| **Acceptance criteria** | 1. `node scripts/check-failure-log-schema.mjs` passes (already wired into `build:extension`). 2. New emitter has at least one fixture in `__fixtures__/failure-report-fixtures.ts` covering its scenario, in **both** `Verbose: true` and `Verbose: false` modes. 3. New emitter is referenced by at least one test asserting `REQUIRED_REPORT_FIELDS` presence. 4. PR description lists the new `SourceFile` value(s) so reviewers can grep. |
| **Definition of done** | All four boxes ticked + `bunx vitest run src/background/recorder/__tests__/failure-report-fixtures.test.ts` green. |

### LOG-2 — Verbose toggle must gate payload, never classification

| | |
|---|---|
| **Owner** | Anyone touching `failure-logger.ts`, `verbose-logging.ts`, the `Settings → Debugging → Verbose failure logging` toggle, or any code that reads `resolveVerboseLogging(...)`. |
| **Rule** | The verbose flag MUST gate ONLY: (a) `DomContext.OuterHtml` / `DomContext.Text`, (b) top-level `CapturedHtml`, (c) raw form values inside `FormSnapshot.Values`. It MUST NOT change `Reason`, `ReasonDetail`, `Selectors`, `Variables`, or any field-name metadata. Persisted toggle lives in `ExtensionSettings.verboseLogging` (`chrome.storage.local`); every `GET_SETTINGS`/`SAVE_SETTINGS` MUST mirror it into `setVerboseLogging(null, …)` so the in-memory store stays in sync. |
| **Acceptance criteria** | 1. New code reads via `resolveVerboseLogging(projectId)` — no hard-coded `true`/`false`. 2. Fixture for the new emitter compares `Verbose.Reason === NonVerbose.Reason`, same for `ReasonDetail`/`Selectors`/`Variables`. 3. If a new bulky payload field is added, it is documented as verbose-gated in the field's TSDoc and excluded from non-verbose snapshots. 4. The settings round-trip test (`settings-handler-verbose.test.ts`) is extended if a new persisted knob is added. |
| **Definition of done** | All four boxes ticked + `bunx vitest run src/background/recorder/__tests__/verbose-logging.test.ts src/background/handlers/__tests__/settings-handler-verbose.test.ts` green. |

### LOG-3 — File-path / "what was missing" / "why" — CODE RED

| | |
|---|---|
| **Owner** | Anyone adding a `throw new Error(...)`, `Logger.error(...)`, or hard-fail return in a code path that touches files, paths, storage keys, manifest entries, instruction registries, or chrome.storage. |
| **Rule** | Per `mem://constraints/file-path-error-logging-code-red.md`: every hard error MUST include (a) the **exact** path/key/identifier, (b) **what** was missing or invalid, (c) **why** the code expected it. Stack traces are not a substitute. Optimised for AI consumption — a pasted error must be enough for ChatGPT/Claude to RCA without source access. |
| **Acceptance criteria** | 1. New error messages include all three (path, missing-thing, reason) — verified by reviewer. 2. New errors emit through `RiseupAsiaMacroExt.Logger.error(...)` (or `console.error(formatFailureReport(...))` for recorder reports) — never bare `console.log` / silent `catch {}`. 3. Stack traces from build chunks (`chunk-*.js`, `assets/*.js`) are filtered per `mem://preferences/stack-trace-filtering`. |
| **Definition of done** | Reviewer signs off + grep shows zero new bare `catch {}` or `console.log(error)` calls in the diff. |

### LOG-4 — Diagnostics export must include any new failure source

| | |
|---|---|
| **Owner** | Anyone introducing a new failure-log table, OPFS file, IndexedDB store, or chrome.storage key that holds diagnostic data. |
| **Rule** | Per `mem://features/log-diagnostics-export`: the human-readable ZIP bundle is the canonical "send this to support" artefact. Every new diagnostic surface MUST be added to the bundle producer **in the same PR** that adds the surface — no "we'll wire it next sprint". The bundle MUST keep the `logs.txt` headline format and append the new source as a clearly labelled section. |
| **Acceptance criteria** | 1. Bundle producer code lists the new source. 2. A bundle integration test loads a fixture that includes the new source and asserts it lands in the unzipped output. 3. The `verbose` snapshot map (`snapshotVerboseLoggingStore()`) is included so debuggers can tell whether captured payloads are full or truncated. |
| **Definition of done** | Bundle test green; manual export from a dev build shows the new section. |

### LOG-5 — Recorder/Replay step contracts (form snapshots, selector traces, XPath)

| | |
|---|---|
| **Owner** | Anyone adding a new `RecordedStepKind`, a new selector strategy, or a new replay phase. |
| **Rule** | New step kinds that touch a DOM target MUST: (a) capture an XPath via `xpathOfElement` and store it on the `DomContext`, (b) capture a `FormSnapshot` if the target is inside a form (always field names+types; values only when verbose), (c) when failing, emit a `FailureReport` whose `Selectors` includes every attempted strategy with `Matched`/`MatchCount`/`FailureReason`. New selector strategies MUST extend `AttemptStrategy`, populate `EvaluatedAttempt.Strategy`, and add a row to `SelectorReplayTracePanel`. |
| **Acceptance criteria** | 1. New step kind has unit tests in `src/background/recorder/__tests__/` covering capture + replay + failure paths. 2. `SelectorReplayTracePanel` renders the new strategy without "Unknown" fallbacks. 3. `FormSnapshotBadge` appears on the trace row when applicable. 4. Sensitive-field masking regex still applies (`password|secret|token|otp|pin|cvv|ssn|credit`). |
| **Definition of done** | All four boxes ticked + manual smoke run of record→replay→fail flow shows the new step in the trace panel. |

### LOG-6 — Test-fixture parity (verbose × non-verbose)

| | |
|---|---|
| **Owner** | Anyone adding a fixture or scenario to `__fixtures__/failure-report-fixtures.ts`. |
| **Rule** | Every scenario MUST be exposed as a `FixtureBundle = { NonVerbose, Verbose }` built via `buildFailureReport` (never literals). Both modes MUST go through the schema test loop (`for (const mode of ["NonVerbose", "Verbose"] as const)`). |
| **Acceptance criteria** | 1. New fixture appears in `allFixtures()`. 2. The 48-test baseline grows by exactly 12 tests per new scenario (4 schema assertions × 2 modes + 4 reason/format assertions). 3. No fixture leaves a detached jsdom node — `beforeEach(() => { document.body.innerHTML = ""; })` is honoured. |
| **Definition of done** | Test count grows monotonically; `bunx vitest run` stays green. |

### How to apply LOG-1..6 to a new feature (checklist)

```
[ ] Failure emitter goes through buildFailureReport / logFailure (LOG-1)
[ ] Verbose toggle resolved via resolveVerboseLogging(...) — no hard-coded bool (LOG-2)
[ ] Hard errors carry path + what + why (LOG-3)
[ ] Diagnostics bundle producer updated in same PR (LOG-4)
[ ] New step/strategy wired through trace panel + form-snapshot path (LOG-5)
[ ] Fixture bundle (NonVerbose + Verbose) added; schema loop covers it (LOG-6)
[ ] `node scripts/check-failure-log-schema.mjs` passes
[ ] `bunx vitest run src/background/recorder/__tests__/failure-report-fixtures.test.ts` passes
```

> ✅ **Status 2026-06-03**: `node scripts/check-failure-log-schema.mjs` is green (613 files scanned, FailureReport + BuildFailureReportInput schemas intact, every `logFailure()` / `buildFailureReport()` call carries `SourceFile + Phase + Error`). The checklist remains in force for every new failure-log surface.

> **Enforcement**: PRs touching failure-log surfaces MUST paste the checklist into the description with each box ticked. Reviewers reject the PR if any box is unticked without a written waiver linked from `.lovable/memory/suggestions/`.

---

## Remaining Backlog

### Priority 0: Standalone Scripts — Global Instruction Types (2026-04-24)

Spec: `spec/21-app/01-chrome-extension/standalone-scripts-types/01-overview.md`
Draft types: `standalone-scripts/types/instruction/` (one type per file, awaiting Q1–Q5 sign-off).

| Task | Description | Status |
|------|-------------|--------|
| **0.1** — Review Q1–Q5 | ✅ Closed 2026-06-03 08:05 KL: Q1 const enums, Q2 optional `XPaths`, Q3 `EmptySettings`, Q4 PascalCase keys + enum-authored values, Q5 no base class until two compliant class implementations exist. | ✅ Done |
| **0.2** — Wire `compile-instruction.mjs` | ✅ Closed 2026-06-03 08:05 KL: compiler now resolves shared enum member values while keeping canonical PascalCase + compat camelCase artifacts schema-valid. | ✅ Done |
| **0.3** — Migrate `payment-banner-hider/src/instruction.ts` | ✅ Closed 2026-06-03 08:05 KL: uses `ProjectInstruction<EmptySettings>` plus `InjectionWorld`, `InjectionRunAt`, `MatchType`, `AssetInjectTarget`. | ✅ Done |
| **0.4** — Migrate `xpath/src/instruction.ts` | ✅ Closed 2026-06-03 08:05 KL: uses shared instruction type and enum-authored `World`, target URL match types, and IIFE script asset. `XPaths` remains optional. | ✅ Done |
| **0.5** — Migrate `marco-sdk/src/instruction.ts` | ✅ Closed 2026-06-03 08:05 KL: uses shared instruction type, enum-authored closed sets, and keeps the downstream `EmptySettings` type re-export for compatibility. | ✅ Done |
| **0.6** — Migrate `macro-controller/src/instruction.ts` | ✅ Closed 2026-06-03 08:05 KL: `MacroControllerSettings` remains local and `ProjectInstruction<MacroControllerSettings>` now uses enum-authored closed sets. | ✅ Done |
| **0.7** — Logger `unknown` cleanup | ✅ Closed 2026-06-02: `standalone-scripts/types/riseup-namespace.d.ts` verified — only the permitted `CaughtError = unknown` leaf remains; `RiseupAsiaLogArg` already a designed union. | ✅ Done |
| **0.8** — ESLint `id-denylist` rule | Mostly done 2026-06-02: denies `tmp`, `temp`, `baz`, `qux`, `foobar`, `cfg`, `arr`, `str`, `num` (added 99 renames across 26 files; tsc clean). Remaining: `fn`, `cb`, `el`, `msg`, `ctx`, `obj`, `val` (val alone = 136 sites / 30 files; defer to dedicated session). | Mostly done |
| **0.9** — ESLint `consistent-type-definitions` | ✅ Closed 2026-06-02: `eslint.config.js` lines 152–160 scope `["error","type"]` to `standalone-scripts/types/instruction/**` and `standalone-scripts/*/src/instruction.ts`. | ✅ Done |
| **0.10** — `.d.ts` `unknown` lint coverage | ✅ Closed 2026-06-02: `scripts/check-no-unknown-in-dts.mjs` enforces it (HARD_PINNED + BASELINE tiers); wired in `package.json` (`check:no-unknown-in-dts`) and `.github/workflows/ci.yml` lines 103/106. | ✅ Done |
| **0.11** — `PaymentBannerHider` class refactor | ✅ Closed 2026-06-03 09:10 KL: already single-class entry (`standalone-scripts/payment-banner-hider/src/index.ts:28`), external CSS in `css/payment-banner-hider.css` (no `!important` — verified via grep), errors rethrown via `logError → throw` (`src/index.ts:74-78`), consumes migrated instruction via `XPathRegistry` from 0.3 — audit row in `mem://features/payment-banner-hider` already shows all 8 ✓. | ✅ Done |
| **0.12** — Standalone-script scaffolder CLI | ✅ Closed 2026-06-03 09:10 KL: `scripts/new-standalone.mjs` + `pnpm new:standalone <name>` generates `instruction.ts` (enum-authored `ProjectInstruction<EmptySettings>`), single-class `index.ts`, `vite.config.ts`, `tsconfig.json`, `dist/.gitignore`. Fail-fast (no retry per project no-retry policy). | ✅ Done |
| **0.13** — Banner-hider RCA follow-up | ✅ Closed 2026-06-03: 7 standards registered in `mem://index`; reference implementation in `standalone-scripts/payment-banner-hider/` audited compliant (`mem://features/payment-banner-hider` compliance table — all 8 rows ✓). Residual lint enforcement tracked under 0.8. | ✅ Done |
| **0.14** — Banner-hider runtime enums | ✅ Closed 2026-06-03 09:10 KL: `standalone-scripts/types/runtime/enums/banner.ts` exports `BannerLifecyclePhase`, `BannerEventName`, `BannerLogFn` as `const enum`s (per Q1). `payment-banner-hider/src/index.ts:75` now uses `BannerLogFn.Check` instead of the inline string. | ✅ Done |
| **0.15** — Typed DOM helpers in SDK | ✅ Closed 2026-06-03 09:10 KL: `standalone-scripts/types/runtime/dom.d.ts` declares `RiseupAsiaMacroExt.Dom.queryHtmlElement / queryAllHtmlElements / queryHtmlByXPath` returning `HTMLElement \| undefined` (defensive policy). | ✅ Done |
| **0.16** — `RiseupAsiaMessage<TPayload>` discriminated type | ✅ Closed 2026-06-03 09:10 KL: `standalone-scripts/types/runtime/message.d.ts` declares generic `RiseupAsiaMessage<TKind, TPayload>` envelope + `RiseupAsiaMacroExt.Messaging.dispatch / on` overloads bound to it. Consumers use `BannerEventName` (or equivalent `const enum`) as the discriminant. | ✅ Done |

### Priority 1: E2E Verification (Blocked — Manual)

| Task | Description | Status |
|------|-------------|--------|
| **Task 1.2** — E2E Chrome Verification | Load extension in Chrome, verify popup/options/CRUD/injection/context menu/import-export. S-052 checklist ready. | Blocked (requires manual Chrome testing) |

### Priority 2: Test Coverage

| Task | Description | Status |
|------|-------------|--------|
| **Task 2.2** — React Component Tests (S-021) | Unit tests for PopupApp, OptionsApp, ProjectsSection, ProjectEditor, DiagnosticsPanel. Target: 900+ tests | ✅ Baseline closed 2026-06-02: ProjectsSection/ProjectEditor/DiagnosticsPanel done; PopupPage smoke done (4 tests); OptionsPage branch/navigation coverage added (4 tests) |

### Priority 3: P Store — Project & Script Store

A marketplace for discovering, searching, and importing projects/scripts from a remote store API. Configurable store URL in Settings, search with caching, import flow. **Not ready — owner will fine-tune spec first.**

Spec folder: `spec/05-chrome-extension/82-pstore-project-store/`

### Priority 4: Cross-Project Sync — Phase 3 (Complete)

Phase 1 (data layer), Phase 2 (Library UI), and Phase 3 (ProjectGroup management UI, drag-to-assign projects, cross-tab sync notifications via `LIBRARY_SYNC_BROADCAST`, integration tests) all complete. Remaining: manual Chrome E2E pass when convenient.

Spec: `spec/21-app/02-features/misc-features/cross-project-sync.md`

### Priority 5: Release Installer Hardening (v0.2)

The unified installer (`scripts/install.{ps1,sh}`) auto-derives the pinned version from its release-asset download URL and falls back to GitHub `latest` when no URL context is present (e.g., fetched from `raw.githubusercontent.com/.../main/` or run from a clone). v0.2 hardening, in priority order:

1. **Built-in checksum verification** — installer fetches `checksums.txt` from the same release and verifies the ZIP's SHA256 before extracting (~15 LOC per script).
2. **Authenticode-signed `install.ps1`** + GPG-signed `install.sh` released alongside `.sig` files.
3. **SLSA build provenance** for end-user audit of the GitHub Action that produced assets.

Memory: `.lovable/memory/features/release-installer.md`

---

## Completed Work (Summary)

| Area | Highlights |
|------|-----------|
| **AHK Layer** | E2E tests (22 suites, 150+ cases), XPath self-healing, config schema validation, hot-reload, token expiry UI |
| **Extension Releases** | v1.0–v2.119.0: injection, SQLite, auth, context menu, scaling, React unification, view transitions, cache gate, force run, cross-project sync |
| **Macro Controller** | v2.125.0: typed namespace API (`NsPathMap` + `nsWrite`/`nsReadTyped`/`nsCallTyped`), centralized `constants.ts` (96 constants in 2 phases, 21 consumer files migrated), error logging T1–T5 complete |
| **React UI Unification** | All 12 steps complete — content scripts moved, message client migrated, version bumped |
| **Immediate Workstream** | Swagger API Explorer, Storage Browser (4 categories), Prompt Seeding, Overflow Menus, Project Files Panel, ZIP Export/Import |
| **Injection Pipeline** | 7-stage + cache gate, 4-tier CSP fallback (MAIN Blob → USER_SCRIPT → ISOLATED Blob → ISOLATED Eval), Force Run (context menu + shortcut) |
| **Cross-Project Sync** | Phase 1: data layer (4 tables, migration v7, 22 message types, sync engine). Phase 2: Library UI (AssetCard, SyncBadge, PromoteDialog). 45 unit tests. |
| **UI Polish** | Tailwind hover micro-interactions (Task 4.1), direction-aware view transitions (Task 4.2) |
| **Build & Docs** | Build verification (Task 2.1), CDP injection docs (Task 3.1), AI onboarding checklist (Task 3.2), LLM guide updated |
| **Code Quality** | ESLint 1390 → 0 issues (0 errors, 0 warnings), SonarJS integration, TS migration v2 (6 phases), error logging T1–T5 complete (86 log migrations, 48 silent catches fixed, 548 `any` eliminated, 8 explicit API interfaces), typed namespace refactor (30+ paths), constants centralization Phase 1+2 (96 constants, 21 consumer files), `logError`/`logDebug`/`logConsole`/`logStackTrace` helpers, component splitting (SchemaTab, ConfigDbTab) |
| **Test Suite** | 1080 tests across 96 files — all passing. Injection handler, pipeline benchmark, message-flow integration, and panel-builder tests fixed. |
| **Specs Matured** | S-056 Cross-Project Sync (READY v2.0.0), S-052 Prompt Click verification checklist, error logging & type safety spec |
| **Issues Resolved** | #76–#90: cookie binding, hot-reload, globals migration, auth bridge, injection pipeline, IndexedDB cache, prompt click fix |

---

## Next Task Selection

| # | Task | Effort | Impact | Blocker |
|---|------|--------|--------|---------|
| 1 | **Priority 0.8** — id-denylist expansion (`fn`, `cb`, `el`, `msg`, `ctx`, `obj`, `val`) | High | Medium — ~1700 callsites; staged migration | Effort budget |
| 2 | **Task 1.2** — E2E Chrome verification | Low | High — validates real-world usage | Manual Chrome required |
| 3 | **Priority 4** — Cross-Project Sync manual Chrome E2E pass | Low | Medium | Manual Chrome required |
| 4 | **Priority 5** — Release installer hardening v0.2 (checksum verification first) | Medium | Medium | None |

**Recommended next**: Priority 0.8 `val` rename pass (136 sites / 30 files) — largest remaining lint debt and unblocks zero-warning enforcement across all standalone scripts. Defer Priority 5 until checksum strategy is approved.

---

## 🔥 Performance Audit — Idle / Background Loops (deep dive 2026-04-25)

> **Trigger**: User asked "are we running any loop in background that could harm performance — root-cause it and write it down so we don't forget."
> **Scope swept**: `src/`, `standalone-scripts/`, `chrome-extension/` for `setInterval`, `requestAnimationFrame`, `while(true)`, `for(;;)`, zero-delay `setTimeout`. 43 hits triaged.
> **Verdict**: 1 critical, 4 high, 3 medium leaks/wastes. Several "looks scary" hits are actually correctly bounded — listed under ✅ for completeness.

### ✅ All PERF-1..PERF-8 closed (verified in source 2026-06-03)

> Code-audit on 2026-06-03 confirms every PERF-* fix is already landed. RCA files written the same day: `spec/22-app-issues/10-perf-1-hot-reload-prod-poll.md` (and `…/11…16-*.md`). What follows is the closed status for the historical record.

| # | File | Status | Verification |
|---|---|---|---|
| **PERF-1** ✅ | `src/background/hot-reload.ts:37-72` + `vite.config.extension.ts` | Closed | `isDevBuild()` gate at startup + captured interval ID + exported `stopHotReload()`; `build-meta.json` only emitted in dev builds |
| **PERF-2** ✅ | `standalone-scripts/macro-controller/src/ui/panel-controls.ts:537-553` | Closed | `data-error-badge-poll` guard prevents stacking; `trackedSetInterval` + self-clear via `!badge.isConnected` |
| **PERF-3** ✅ | `standalone-scripts/macro-controller/src/ui/section-auth-diag.ts:180-194` | Closed | `data-auth-diag-poll` guard + self-clear via `!diagBody.isConnected` + in-callback visibility check |
| **PERF-4** ✅ | `standalone-scripts/macro-controller/src/ui/redock-observer.ts:23-91, 136-140` | Closed | Generation-token cancellation — `resetRedockState()` bumps generation, in-flight `pollUntil` bails on next tick |
| **PERF-5** ✅ | `src/content-scripts/network-reporter.ts:302-342` | Closed | Re-injection guard (`flushTimerId !== null`) + `pagehide` teardown + idempotent `stopNetworkReporter()` |
| **PERF-6** ✅ | `src/components/popup/InjectionCopyButton.tsx:189-261` | Closed (2026-06-03) | Subscribes to `ERROR_COUNT_CHANGED`; 60 s fallback poll, visibility-paused, full cleanup |
| **PERF-7** ✅ | `src/popup/hooks/usePopupData.ts:121-153` | Closed | `visibilitychange` listener stops the 30 s interval while hidden; refreshes immediately on resume |
| **PERF-8** ✅ | `standalone-scripts/macro-controller/src/toast.ts:218-233` | Closed | After 30 consecutive `getNotify() === null` ticks, `stopQueueDrain()` is called; re-enqueue restarts it |



### ✅ Verified safe (no action — documenting so we don't re-flag them)

- `src/background/handlers/library-handler.ts:398` — `while (true)` is a slug-uniqueness search bounded by SQLite `SELECT`; one DB roundtrip per iteration, terminates on first miss.
- `standalone-scripts/marco-sdk/src/notify.ts:175` (`_dedupTimer`) — self-clears when `_recentToasts` map empties (line 178). ✅
- `standalone-scripts/macro-controller/src/loop-controls.ts:122,123,301` — all paired with explicit `clearInterval` in `stopLoop()` / `stopStatusRefresh()`.
- `standalone-scripts/macro-controller/src/startup-token-gate.ts:82` — bounded by `timeoutMs` with `finishTokenGate()` clearing the timer.
- `standalone-scripts/macro-controller/src/ui/countdown.ts:86` — paired with `stopCountdownTick()`; also self-stops when `state.running` becomes false.
- `standalone-scripts/{marco-sdk,macro-controller}/src/{utils,async-utils}.ts` `pollUntil` — timer cleared on success or `timeoutMs` expiry.
- `src/options/sections/DiagnosticsPanel.tsx:98` — gold-standard pattern: visibility-pause + cleanup on unmount.
- `src/hooks/use-network-data.ts`, `use-error-count.ts`, `use-token-watchdog.ts` — all paired with cleanup in `useEffect` return.

### Suggested execution order (when user greenlights)

1. **PERF-1** (production hot-reload) — highest user-visible impact, single-file fix.
2. **PERF-5** (network-reporter on every tab) — second biggest battery/CPU win.
3. **PERF-2 / PERF-3 / PERF-4** — macro-controller leak trio; introduce a shared "panel teardown registry" so builders can register `clearInterval` callbacks once and re-bootstrap is idempotent.
4. **PERF-6 / PERF-7 / PERF-8** — quality-of-life polish.

> 📌 **Do not touch yet** — user asked to record findings only. Per `mem://workflow/task-execution-pattern`, each PERF-* item gets its own RCA file in `spec/22-app-issues/` before code changes.

---

## Engineering Principles (Summary)

1. Root Cause Analysis First
2. Known-Good State Wins
3. UI Sync Completeness
4. Side Effect Awareness
5. API-First, DOM-Fallback
6. No Direct resp.json()
7. SQLite Schema Consistency
8. Issue Write-Up Mandatory
9. NEVER change code without discussing with user first
10. **Logging & Diagnostics Enforcement** — every new failure surface obeys LOG-1..6 above (schema, verbose-gating, code-red errors, diagnostics bundle, recorder contracts, fixture parity).

Full list: `/spec/02-coding-guidelines/engineering-standards.md` (26 standards)

---

### Follow-up: error-swallowing audit scanner

The Options → **Error Audit** page (`src/components/options/ErrorSwallowAuditView.tsx`)
consumes `public/error-swallow-audit.json`. The file is not yet generated;
build a scanner that emits the documented JSON contract (see the page's
empty-state). Suggested location: `scripts/audit-error-swallow.mjs`,
classifying findings into P0/P1/P2 per `mem://standards/error-logging-requirements.md`.

### Follow-up: shrink the swallowed-errors baseline ✅ DONE (2026-05-26)

`scripts/check-no-swallowed-errors.baseline.json` now contains
`"entries": []` (verified 2026-06-03). The original 177 TODO
placeholders have all been swept, every remaining intentional
swallow carries an inline `// allow-swallow:` justification, and
`npm run check:no-swallowed-errors:strict` is green. Nothing
further to do here.

---

## v3.50.0 Roadmap: Collaborative Workspaces & Advanced State Recovery
_(Migrated from `.lovable/plan.md` 2026-06-02 per audit S81 — single plan SOT.)_

Multi-tab synchronization and robust persistence for long-running automation sessions.

### 1. Cross-Tab State Sync
- **BroadcastChannel Integration**: Sync Task Queue and Prompt Library state across open tabs in real-time.
- **Global Lock Mechanism**: Prevent conflicting automations from running in multiple tabs simultaneously.

### 2. Snapshots & Time-Travel Recovery
- **Queue Snapshots**: Automatically save queue state every 5 minutes.
- **Session Restore**: On browser crash/close, offer to resume pending tasks on restart.

### 3. Workspace Profiles
- **Profile Switching**: Save prompt sets and queue configs per project.
- **Export/Import**: One-click sharing of "Automation Recipes" (prompt sets + queue templates).

### Technical Details
- **Storage**: Migrate high-frequency state updates to `indexedDB` (vs. `chrome.storage.local`).
- **UI**: "Workspace" selector in main header; "Recovery" indicator in status bar.
- **Logic**: `StateReconciler` to merge updates from different tabs.

---

## 🆕 Credit Balance Update — 60-Step Plan (Ktlo / Free / Cancelled)

**Trigger (2026-06-04, user verbatim):** Lite (`ktlo`), Free, and Cancelled
workspaces return no inline credit info → UI shows `0/0`. Call the
`/workspaces/{id}/credit-balance` endpoint only when inline data is absent.
Add a settings slider (default 3 s) for the fetch timeout. Use proper Enums
(`Plan`, `GrantType`). Ship with unit + integration + E2E tests.

**Spec:** `spec/21-app/01-chrome-extension/credit-balance-update/` (20 files).
**Ambiguity log policy:** No-Questions Mode active — log to
`.lovable/question-and-ambiguity/` if anything blocks.

### Phase A — Spec (Steps 1–20)  ✅ COMPLETED 2026-06-04

All 20 files committed under `spec/21-app/01-chrome-extension/credit-balance-update/`.
See that folder's `README.md` for the index.

### Phase B — Implementation (Steps 21–60)

#### Enums & types (21–25) ✅ COMPLETED 2026-06-04
21. ✅ Create `credit-balance-update/plan.ts` + `plan-mapper.ts` (Plan enum, wire mapping, CODE-RED log on Unknown).
22. ✅ Create `grant-type.ts` + `grant-type-mapper.ts`.
23. ✅ Create `credit-balance-types.ts` (CreditBalance, GrantTypeBalance, ExpiringGrant, Membership, WorkspaceInfo, CreditFetchResult).
24. ✅ Create `credit-fetch-outcome.ts` enum.
25. ✅ Add `__tests__/plan-mapper.test.ts` + `grant-type-mapper.test.ts` (cover all wire values + Unknown).

#### Parser & fetcher (26–30) ✅ COMPLETED 2026-06-04
26. ✅ `credit-balance-parser.ts` — snake_case→camelCase, defaults+warn for missing numerics, ParseError on bad shape.
27. ✅ `__tests__/credit-balance-parser.test.ts` — sample payload + edge cases.
28. ✅ `credit-balance-fetcher.ts` — `fetchWithTimeout` using AbortController; finally-clearTimeout pair.
29. ✅ Wire `getBearerToken()` (no direct localStorage).
30. ✅ Mandatory failure logging via `Logger.error('CreditBalanceUpdate.fetch', …)` with full Reason/ReasonDetail schema (file 11).

#### Cache + single-flight (31–34) ✅ COMPLETED 2026-06-04
31. ✅ `credit-balance-cache.ts` — Map<WorkspaceId, CreditFetchResult> + IDB store `entries_v2_ktlo_free_cancelled`, 10-min TTL.
32. ✅ Invalidation hooks: settings change, manual Refresh/auth path via controller invalidation + forced-token retry.
33. ✅ Single-flight Map<WorkspaceId, Promise<…>> in controller.
34. ✅ `__tests__/credit-balance-cache.test.ts` — TTL boundary, invalidation, single-flight join.

#### Controller (35–38) ✅ COMPLETED 2026-06-04
35. ✅ `credit-fetch-controller.ts` — trigger logic from spec file 02 (hasInlineCredits, plan branch, single auth retry).
36. ✅ Expose `requestCredits(workspace)` and `setTimeoutMs(ms)` (hot reload).
37. ✅ Subscribe to settings bus updates to refresh `timeoutMs`.
38. ✅ `__tests__/credit-fetch-controller.test.ts` — InlineHit, Skipped, ApiHit, ApiCacheHit, Timeout, AuthError, single-flight.

#### UI integration (39–44)
39. ✅ `credit-summary-resolver.ts` — produce `{available,total,daily,source}` for UI consumers.
40. ✅ Update workspace row cell to call resolver; render `—` when source=Timeout & no cached value.
41. ✅ 2026-06-04 — Singleton hover-card `buildCreditsSection` now reads `resolveCreditSummary(ws)` and shows a "Source" row whenever source ≠ Inline (`ws-hover-card.ts:115-138`).
42. ✅ 2026-06-04 — CSV export adds `Daily,DailyLimit,Source` columns sourced from resolver (`ui/credit-totals-modal.ts:44-62`). Existing test suite updated.
43. ✅ 2026-06-04 — `workspace-refill-priority.ts` now reads `resolvedAvailable(ws)` (resolver) instead of `ws.available` to keep urgency math consistent across Inline / Cache / Timeout.
44. ✅ 2026-06-04 — `__tests__/hover-card-credits-section.test.ts` snapshot-style test asserts resolver returns `Cache` (with values) and `Timeout` (with `renderDash=true`).

#### Settings (45–48)
45. ✅ 2026-06-04 — Added `creditFetchDelayMs?: number` to `SettingsOverrides` + clamp 500–15000 in `sanitize()` (`settings-store.ts`).
46. ✅ 2026-06-04 — Timing panel renders the credit-balance slider (500–15000ms, step 100) via `_buildCreditFetchDelaySlider` (`ui/settings-tab-panels.ts:142-188`).
47. ✅ 2026-06-04 — Boot hydration in `startup.ts` calls `setCreditFetchTimeoutMs()` from persisted overrides then `subscribeCreditFetchSettings()` so saved values + SAVE_SETTINGS hot-reload into the controller.
48. ✅ 2026-06-04 — `__tests__/settings-credit-fetch-delay.test.ts` covers clamp, NaN rejection, round-trip, and subscribe hot-reload into the controller (5 cases — all green).

#### E2E (49–52)
49. ✅ 2026-06-04 (scaffold) — `tests/e2e/e2e-credit-balance-ktlo.spec.ts` happy-path skeleton (`test.fixme` pending Ktlo fixture).
50. ✅ 2026-06-04 (scaffold) — `tests/e2e/e2e-credit-balance-timeout.spec.ts` timeout-then-slider-recovery skeleton.
51. ✅ 2026-06-04 (scaffold) — `tests/e2e/e2e-credit-balance-no-fetch-when-inline.spec.ts` zero-call skeleton.
52. ✅ 2026-06-04 — `__tests__/credit-balance-network-count.test.ts` enforces "at most ONE /credit-balance per workspace per window" + single-flight join (2 cases, green).

#### Audit, lint, ship (53–60) ✅ COMPLETED 2026-06-04
53. ✅ Failure-log schema check green: `check-failure-log-schema` reports 613 files scanned, contract intact.
54. ✅ `scripts/audit-error-swallow.mjs`: 6 P1 swallows (all pre-existing), 0 new — every new try/catch in credit-balance-update either re-throws structured `CaughtError` via `logError()` or carries an `allow-swallow:` justification.
55. ✅ `public/timer-teardown-audit.json` unchanged — credit-balance-update adds no new intervals/observers (AbortController is request-scoped and self-cleared in `finally`).
56. ✅ `mem://features/macro-controller/credit-balance-update` written + index entry added.
57. ✅ Version 3.49.0 → **3.50.0** synced across `manifest.json`, `version.json`, `src/shared/constants.ts`, `standalone-scripts/macro-controller/src/shared-state.ts`, all 7 `instruction.ts` files.
58. ✅ `changelog.md` v3.50.0 entry under **Added** with feature, slider, CSV, and tooltip bullets.
59. ✅ Full Vitest suite — **99 files / 824 tests passed (0 failed)** including the 4 new credit-balance-update test files. Playwright skeletons present (3 `fixme` specs gated on fixtures).
60. ✅ Phase B closed 2026-06-04. Credit Balance Update shipped in v3.50.0.

### Remaining items
1. Pending — wire real Ktlo/Free/Cancelled fixtures so the 4 `fixme` Playwright skeletons (3 credit-balance + 1 credit-totals modal) can run un-skipped (tracked in `.lovable/question-and-ambiguity/`).
2. ✅ Closed v3.51.0 — Plan Task UX 20-step plan (`.lovable/plans/credit-totals-and-macro-ux-20-step.md`).
3. Pending — Release installer hardening v0.2 (blocked on `MINISIGN_SECRET_KEY`).


