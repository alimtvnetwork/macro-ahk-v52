# Changelog

All notable changes to the Marco Chrome Extension are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [v2.241.0] — 2026-05-14 Projects modal CSV export with git info

### Added
- **Projects modal — Export CSV** (`standalone-scripts/macro-controller/src/ui/projects-modal.ts`): footer "⬇ Export CSV" button exports every loaded project to a `.csv` file with columns: `workspaceId, workspaceName, creditsUsed, creditsTotal, projectId, projectName, isOpenInChrome, gitRepo, gitBranch, lastCommunication, gitFetchError, extensionVersion, exportedAt`. Sequential per-project fetch with live progress (`Fetching git info: N / M (P%)`) per `mem://constraints/no-retry-policy`.
- **SDK endpoint**: `marco.api.projects.get(projectId)` (`standalone-scripts/marco-sdk/src/api-registry.ts`, `api.ts`) — fetches project metadata; tolerates missing `github_repo` / `github_branch` / `last_message_at` fields.

### Changed
- **Version bump**: 2.240.0 → 2.241.0 across all version-carrying files.

---

## [v2.240.0] — 2026-05-14 Changelog modal and root changelog synchronization

### Added
- **Read Memory prompt** (`standalone-scripts/prompts/15-read-memory/`): onboarding prompt for AI assistant memory reconstruction.
- **Write Memory prompt** (`standalone-scripts/prompts/16-write-memory/`): session-end memory persistence prompt.
- **Coding Guidelines prompt** (`standalone-scripts/prompts/17-coding-guidelines/`): project synthesis and task planning prompt.
- **Minor Bump prompt** (`standalone-scripts/prompts/08-minor-bump/`): automated minor version bump instruction.
- **Major Bump prompt** (`standalone-scripts/prompts/09-major-bump/`): automated major version bump instruction.

### Changed
- **Unified AI Prompt v4** (`standalone-scripts/prompts/04-unified-ai-prompt-v4/`): comprehensive 3-part framework update (repository analysis, spec fix workflow, test failure handling).
- **Rejog the Memory v1** (`standalone-scripts/prompts/03-rejog-the-memory-v1/`): proofread with reliability risk reports and Lovable suggestions filesystem contract.
- **Macro Controller changelog modal** (`standalone-scripts/macro-controller/src/ui/changelog-modal.ts`): updated `CHANGELOG_ENTRIES` with v2.234.0–v2.240.0 entries.
- **Version bump**: 2.239.0 → 2.240.0 across all version-carrying files.

---

## [v2.233.0] — 2026-05-07 Macro controller panel layout fixes

### Fixed
- **Title bar `[ - ]` / `[ x ]` buttons** (`standalone-scripts/macro-controller/src/ui/panel-header.ts`): added `white-space:nowrap;flex-shrink:0` so the minimize and close glyphs render on a single line and never wrap mid-bracket inside narrow panels.
- **Action button row clipping** (`standalone-scripts/macro-controller/src/ui/panel-controls.ts`): removed the legacy `min-width:460px` that forced the row wider than the panel's `overflow:hidden` content area, which clipped the rightmost action buttons (error toggle / hamburger menu) at the panel's default 494px width inside narrow Lovable sidebars. The flex-wrap layout already keeps buttons readable at any width.

### Changed
- **Version bump**: 2.232.0 → 2.233.0 across all version-carrying files.
- **Root `readme.md`**: pinned install instructions and tags to `v2.233.0`.

---

## [v2.232.0] — 2026-05-07 Manifest seeder PascalCase fix and version pin

### Fixed
- **Manifest seeder crash** (`src/background/manifest-seeder.ts`): resolved `TypeError: Cannot read properties of undefined (reading 'length')` in `seedFromManifest` by updating lingering camelCase accesses (`p.name`, `p.scripts`, `p.configs`, `c.key`, `c.seedId`, `dependencyProject.scripts`, `dependencyScript.seedId`) to PascalCase, matching the migrated manifest shape.

### Changed
- **Version bump**: 2.231.0 → 2.232.0 across all version-carrying files.
- **Root `readme.md`**: pinned install instructions and tags to `v2.232.0`.

---

## [v2.231.0] — 2026-05-06

### Changed
- **Version bump**: 2.230.0 → 2.231.0 across all 11 version-carrying files (manifest, `src/shared/constants.ts`, and standalone-scripts: `lovable-common`, `lovable-owner-switch`, `lovable-user-add`, `macro-controller` (instruction + shared-state), `marco-sdk`, `payment-banner-hider` (index + instruction), `xpath`).
- Verified with `node scripts/check-version-sync.mjs` — all version strings synchronized.

### Fixed
- **CI — Quality Badges workflow** (`.github/workflows/quality-badges.yml`): no longer hard-fails when neither `CODACY_PROJECT_ID` nor `CODECLIMATE_REPO_TOKEN` is configured. The verify step now emits a `::notice::`, sets `skip=true`, and exits 0; downstream badge verification and summary steps are gated on `steps.verify_secrets.outputs.skip != 'true'`.
- **CI — Release artifact upload**: prior fix for `gh: Resource not accessible by integration (HTTP 403)` retained.

### Changed
- **`WebhookDeliveryResult` is now a discriminated union** keyed by the `Kind` field (`"success" | "skipped" | "failure"`). Each variant is exported from `src/background/recorder/step-library/result-webhook.ts` as `WebhookDeliverySuccess`, `WebhookDeliverySkipped`, and `WebhookDeliveryFailure`.
- Added runtime validator `validateWebhookDeliveryResult(raw)` — corrupt/legacy log entries are now surfaced as a synthetic `WebhookDeliveryFailure` with a clear `Corrupt webhook log entry — …` message instead of rendering `undefined` in the UI.

### Migration note

Do **not** access variant-specific fields directly on a `WebhookDeliveryResult` value. Narrow with the exported guards first:

```ts
import {
  isWebhookSuccess,
  isWebhookSkipped,
  isWebhookFailure,
  type WebhookDeliveryResult,
} from "@/background/recorder/step-library/result-webhook";

function describe(entry: WebhookDeliveryResult): string {
  if (isWebhookSuccess(entry)) return `OK ${entry.Status}`;          // Status: number
  if (isWebhookSkipped(entry)) return `Skipped: ${entry.SkipReason}`; // SkipReason: string
  if (isWebhookFailure(entry)) return `Failed: ${entry.Error}`;       // Error: string, Status: number | null
  return "Unknown";
}
```

Guards are mutually exclusive and provide full TypeScript narrowing. Reading `entry.SkipReason` / `entry.Error` / `entry.Status` without first calling the matching guard is a type error.

---

## [v2.141.0] — 2026-04-15

### Fixed
- **Header label mapping**: Title bar badge beside `TS Macro` now shows the project name first, while the status line below continues showing the workspace name
- **False workspace fallback**: Generic labels like `Preview` and raw project-name echoes are now rejected as workspace names during dialog detection and cache restore

### Changed
- Version bump: 2.140.0 → 2.141.0 (all synced version files updated)

---

## [v2.140.0] — 2026-04-15

### Added
- **Preview iframe guard**: Domain guard now blocks injection into `id-preview--*.lovable.app` hostnames and embedded iframes (`window !== window.top`), preventing auth timeout errors and false "Preview" workspace name detection

### Changed
- **Title bar badge priority**: Workspace name now displays first in the title bar badge (e.g., "P0155 RM-AR D5 P030") instead of project name; project name moved to tooltip
- Version bump: 2.139.0 → 2.140.0 (all 7 version files synced)

---

## [v2.139.0] — 2026-04-15

### Changed
- **Auth contract unification**: Migrated all operational paths (`startup.ts`, `ws-move.ts`, `rename-api.ts`, `ws-adjacent.ts`, UI components) from legacy `resolveToken()`/`recoverAuthOnce()` to unified `getBearerToken()` / `getBearerToken({ force: true })` contract
- Updated `AuthDiagDeps` and panel wiring to support async token resolution
- Version bump: 2.133.0 → 2.139.0 (all 7 version files synced)

### Removed
- **Legacy auth functions**: Removed `resolveToken`, `recoverAuthOnce`, `invalidateSessionBridgeKey` — single Auth Bridge path enforced project-wide
- **Supabase references**: Purged all Supabase-specific auth/token/localStorage references from startup gate, diagnostics, and token retrieval — project uses its own auth system exclusively (extension bridge + cookie + signed URL)

### Fixed
- **TS build errors**: Removed unused imports, prefixed unused params with `_`, converted illegal `await` in non-async functions to `.then()` chains
- **Version sync**: All 7 version files (manifest.json version + version_name, constants.ts, shared-state.ts, instruction.ts ×3) now validated by `check-version-sync.mjs`

---

## [v2.119.0] — 2026-04-08

### Fixed
- Resolved all 20 ESLint warnings across 16 files (cognitive-complexity, max-lines-per-function, unused directives)

---

## [v2.118.0] — 2026-04-08

### Changed
- Version bump: 2.117.0 → 2.118.0 (all version files synced)
- CI: root `pnpm install` now always uses `--no-frozen-lockfile` (fixes missing lockfile error)

---

## [v2.117.0] — 2026-04-08

### Fixed
- **Release CI install failure**: `.github/workflows/release.yml` no longer hard-fails on `pnpm install --frozen-lockfile` when `pnpm-lock.yaml` is absent — both root and `chrome-extension/` now fall back to `pnpm install --no-frozen-lockfile --lockfile=false`

### Added
- Release pipeline now runs root ESLint plus `chrome-extension` ESLint before tests
- Generated GitHub release notes now include Bash + PowerShell install commands, manual unpacked-install steps, and explicit `changelog.md` asset listing

### Changed
- Version bump: 2.116.0 → 2.117.0 (all version files synced)

---

## [v2.114.0] — 2026-04-08

### Added
- **Auth diagnostics — Help tooltips**: ❓ icon appears on Bridge FAILED rows with context-aware explanations (e.g. "Extension context invalidated" explains the page needs a refresh)
- **Toast redesign**: Solid dark minimal style (#1a1a2e) with left accent bar (green/red), stacking (max 3), smooth slide-up animation — replaces old flat colored toasts

### Changed
- Version bump: 2.113.0 → 2.114.0 (all version files synced)

---

### Fixed
- **Prompt dropdown — Task Next submenu**: snapshot restore path cleaned up Task Next sub-menus but never rebuilt them — hover/click stopped working after cache restore
- **Prompt dropdown — Load button**: replaced broken emoji icon (🔄 → ↻) with solid styled button; added error recovery so button doesn't stay stuck on failure
- **Prompt dropdown — Header rebind**: Load button lost onclick handler after snapshot restore — added `_rebindHeader()` to the rebind pipeline
- **Pale large prompts**: prompts with missing/empty text now show "(text not loaded)" label, dimmed badge, and helpful click toast instead of appearing silently broken

### Changed
- Version bump: 2.112.0 → 2.113.0 (all version files synced)

---

## [v2.112.0] — 2026-04-07

### Fixed
- **ROOT CAUSE**: Hardcoded fallback prompt texts were stale summaries, not matching actual `prompt.md` source files — Unified AI Prompt v4 had unnumbered steps, Issues Tracking had completely wrong text, Audit Spec v1 had different rubric
- **ROOT CAUSE**: `computeBundledVersion()` only hashed `id:name:version` — text-only changes in `prompt.md` files did NOT trigger DB re-seeding, leaving stale text in SQLite forever
- Fixed Audit Spec v1 id mismatch: `default-audit` → `default-audit-spec` to match `info.json`

### Changed
- `computeBundledVersion()` now includes `text.length` in hash signature — any text change forces re-seeding
- All 14 hardcoded fallback prompts synced with actual `prompt.md` source files
- Parity test updated with corrected `default-audit-spec` id
- Version bump: 2.111.0 → 2.112.0 (all version files synced)

---

## [v2.111.0] — 2026-04-07

### Fixed
- **ROOT CAUSE**: Large prompts (e.g., `Unit Test Issues V2 Enhanced`, 5689 chars) not appearing in dropdown — missing from both `DEFAULT_PROMPTS` (prompt-loader.ts) and `getFallbackDefaultPrompts()` (prompt-handler.ts) fallback lists
- `normalizePromptEntries()` silently dropped entries with empty name/text — now logs diagnostic warnings with entry id, slug, and reason for drop

### Added
- `Unit Test Issues V2 Enhanced` prompt added to all fallback prompt lists (14 → 15 entries)
- Diagnostic warning logs in `normalizePromptEntries()` when entries are dropped (aids future debugging)
- Version number displayed in startup timing waterfall summary footer (`v2.111.0`)
- Defensive integration test (`task-next-no-fallback.test.ts`) verifying no `entries[0]` fallback regression

### Changed
- Version bump: 2.110.0 → 2.111.0 (all version files synced)

---

## [v2.110.0] — 2026-04-07

### Added
- README **Installation (End Users)** section with quick-install one-liners for Linux/macOS (`curl | bash`) and Windows (`irm | iex`)
- Cross-platform install scripts: `install-extension.sh` (Bash) and `install-extension.ps1` (PowerShell) with `--version` and `--dir` flags
- Release assets table documenting all `.zip` packages, installer scripts, and metadata files
- Manual install instructions for loading the unpacked extension in Chromium browsers
- Automated prompt parity check test (`prompt-parity-check.test.ts`) ensuring `DEFAULT_PROMPTS` ↔ DB seed stay in sync
- Added missing `Code Coverage Basic`, `Code Coverage Details`, and `Audit Spec v1` entries to both prompt lists

### Changed
- Version bump: 2.109.0 → 2.110.0 (all version files synced)

---

## [v2.109.0] — 2026-04-07

### Fixed
- **REGRESSION**: Duplicate project name displayed in panel header — removed dead `loop-project-name` element and `updateProjectNameDisplay()`, project/workspace name now shown exclusively via `wsNameEl` (id=`loop-title-ws-name`)
- **REGRESSION**: XPath-based workspace name extraction (`getProjectNameFromDom`) replaced with API-only resolution — `getDisplayProjectName()` no longer uses DOM XPath
- "Focus Current" now always re-detects workspace from API (`mark-viewed`) instead of using stale cached values
- Stop section now resolves workspace name from `loopCreditState.currentWs` as fallback, ensuring display regardless of loop state

### Changed
- Version bump: 2.108.0 → 2.109.0 (all version files synced)

---

### Fixed
- **REGRESSION**: "Next Task" flow incorrectly returned Start Prompt instead of the correct Next Tasks prompt — removed dangerous `entries[0]` fallback in `findNextTasksPrompt()` that silently returned the first prompt (Start Prompt) when no match was found
- **REGRESSION**: `DEFAULT_PROMPTS` fallback array in `prompt-loader.ts` was missing the "Next Tasks" entry entirely — added it with proper `slug: 'next-tasks'` and `id: 'default-next-tasks'` fields
- Excessive newline insertion in large prompts — enhanced `normalizeNewlines()` to handle Windows `\r\n` line endings and collapse blank-ish lines containing only whitespace between newlines
- All `DEFAULT_PROMPTS` entries now include `slug` and `id` fields for reliable lookup across all pipeline stages

### Added
- 6 new regression tests: `findNextTasksPrompt` selection logic (4 tests), Windows `\r\n` normalization, whitespace-between-newlines collapse
- Root cause analysis spec at `spec/22-app-issues/prompt-next-task-regression-newline-formatting-rca.md`

### Changed
- Version bump: 2.107.0 → 2.108.0 (all version files synced)

---

## [v1.77.0] — 2026-04-07

### Added
- Diagnostic logging in `findNextTasksPrompt()` — prints slug/id of every prompt entry during resolution to confirm fields survive the full pipeline (load → cache → resolve)

### Changed
- Macro Controller version bump: 2.106.0 → 2.107.0

---


### Added
- Regression tests for prompt normalization — 11 tests covering slug/id/isDefault field preservation and newline normalization

### Fixed
- `CachedPromptEntry` interface missing `slug` field — prompts lost slug after IndexedDB cache round-trip
- `prompt-dropdown.ts` local `PromptEntry` interface missing `slug` field

### Changed
- Macro Controller version bump: 2.105.0 → 2.106.0

---

### Fixed
- **Next Task regression** — `normalizePromptEntries()` dropped `slug`, `id`, `isDefault` fields causing `findNextTasksPrompt()` to always fall through to `entries[0]` (start prompt) instead of resolving the correct `next-tasks` slug
- **Excessive newlines in large prompts** — added `normalizeNewlines()` to collapse 3+ consecutive blank lines before editor injection

### Changed
- `pasteIntoEditor()` now normalizes whitespace before injecting prompt text
- Macro Controller version bump: 2.104.0 → 2.105.0

### Root Cause Analysis
- [RCA: prompt-next-task-regression](spec/22-app-issues/prompt-next-task-regression-newline-formatting-root-cause-version-bump-and-changelog.md)

---

## [v2.4.0] — 2026-04-05

### Added
- Advanced Automation engine (chains, scheduling, step executors, condition evaluators)
- Color-coded console.group/groupEnd for injection pipeline logs mirrored to tab DevTools
- Nested sub-groups in pipeline logs (📊 Stage Summary + 📜 Per-Script Results)
- Method-name prefixes in manifest-seeder and session-log-writer error messages

### Fixed
- `compile-instruction.mjs` — capture preamble `const` declarations (e.g. `LOVABLE_BASE_URL`) for `new Function()` evaluation context

### Verified
- Build pipeline (`npm run build:extension`) produces all 17 expected output files
- React UI unification Steps 1-9, 11-12 confirmed complete; content scripts already migrated
- `message-client.ts` already uses `getPlatform().sendMessage()` — no direct `chrome.runtime` calls
- CDP injection fallback fully documented (spec 47)
- AI onboarding checklist (S-029) already in master overview

---

## [v7.17] — 2026-02-25

### Fixed
- Controller injection failure — `LoopControlsXPath` updated (`div[2]` → `div[3]`)
- Check button no longer dies on 401 — falls through to XPath detection
- 401/403 now triggers `markBearerTokenExpired` in both sync/async fetch
- Per-selector verbose logging with ✅/❌ (previously only logged count)

### Removed
- Tier 1 mark-viewed API fully deleted from `autoDetectLoopCurrentWorkspace()`

### Added
- Token expiry UI feedback
- 📥 Export Bundle feature
- XPath self-healing via CSS selector fallback (S-012)

---

## [v7.16] — 2026-02-25

### Changed
- Strict injection-first sequence with Step 0 verification

---

## [v7.9.53] — 2026-02-24

### Changed
- Progress bar segment reorder: 🎁→💰→🔄→📅
- Rollover segment styled gray

---

## [v7.9.52] — 2026-02-24

### Added
- CSV export for workspace data
- Workspace count label in UI

---

## [v7.9.51] — 2026-02-24

### Fixed
- InjectJSQuick focus-steal fix — detached Console no longer loses focus (issue #13)

---

## [v7.9.45] — 2026-02-23

### Changed
- F12 removed from injection; Ctrl+Shift+J only

### Fixed
- Ctrl+Shift+J toggle-close bug when Console already active (issue #12)

---

## [v7.9.41] — 2026-02-23

### Restored
- DevTools two-branch injection strategy

---

## [v7.9.40] — 2026-02-23

### Added
- Smart workspace switching — automatically skips depleted workspaces

---

## [v7.9.34] — 2026-02-23

### Fixed
- Post-move state corruption — authoritative API guard prevents stale XPath overwrite (issue #09)

---

## [v7.9.25] — 2026-02-23

### Added
- 3-tier workspace detection hierarchy

---

## [v7.9.24] — 2026-02-23

### Changed
- Comprehensive fetch logging standard applied across all API calls

---

## [v7.9.15] — 2026-02-22

### Changed
- Credit formula finalized with shared helpers

---

## [v7.9.8] — 2026-02-22

### Added
- JS history tracking
- Injection failure detection
- Double-click move support

---

## [v7.9.7] — 2026-02-21

### Changed
- AHK delegation deprecated → API-direct mode

---

## [v7.9.2] — 2026-02-21

### Fixed
- Workspace state clobber on rapid switches

---

## [v7.9.1] — 2026-02-21

### Added
- ClickPageContent context anchoring

---

## [v7.8] — 2026-02-21

### Added
- InjectJSQuick — optimized 3-call injection
- Domain guard for script isolation

---

## [v7.5] — 2026-02-21

### Added
- Bearer token sharing across modules
- Unified layout system
- Searchable workspace dropdown

---

## [v7.0] — 2026-02-21

### Changed
- Full modular architecture rewrite
- Config constants extracted to `config.ini`

### Added
- Credit status API integration

---

## [v6.55] — 2026-02-19

### Milestone
- Stable baseline archived (`marco-script-ahk-v6.55/`)

---

## [v6.45] — 2026-02-19

### Fixed
- Toggle-close bug
- Double-confirm prompt guard

---

## [v6.1] — 2026-02-18

### Fixed
- DevTools collision with delegation stability

---

## [v5.4] — 2026-02-18

### Fixed
- `$`-prefix hotkeys regression
- F6 removed from injection flow

---

## [v5.2] — 2026-02-18

### Added
- Three-tier fast path recovery
- Exponential backoff on retries

---

## [v4.9] — 2026-02-17

### Added
- Foundation: logging, draggable UIs, multi-method XPath, keyboard shortcuts
