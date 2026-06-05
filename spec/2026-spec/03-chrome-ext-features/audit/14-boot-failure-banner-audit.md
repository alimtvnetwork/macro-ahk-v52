# Audit 14 — Boot Failure Banner

- **Source spec**: `../14-boot-failure-banner.md`
- **Audit date**: 2026-06-05 (Asia/Kuala_Lumpur)
- **Audited against**: `mem://architecture/extension-error-management`,
  `mem://features/log-diagnostics-export`,
  `mem://features/wasm-probe-persistence`,
  `mem://features/click-trail-failure-snapshot`,
  `mem://standards/error-logging-requirements`,
  `mem://constraints/file-path-error-logging-code-red`,
  `mem://constraints/no-retry-policy`,
  source code references in `src/components/popup/BootFailureBanner.tsx`,
  `src/pages/Popup.tsx`, and `src/shared/messages.ts`.

## Score: 18 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 |     3 |
| Determinism (AI can implement)  |     25 |     2 |
| Completeness of acceptance      |     20 |     0 |
| Cross-references                |     15 |     8 |
| Pitfalls coverage               |     15 |     5 |
| **Total**                       |    100 |  **18** |

## Root cause

`README.md` advertises `14-boot-failure-banner.md`, and earlier specs reference
step 14 as the surface for bootstrap failures, but the source spec file is not
present in `spec/2026-spec/03-chrome-ext-features/`. The implementation concept
exists in the current codebase and memory, yet the generic 2026 spec has no
portable contract for an AI to follow. This is why the audit cannot validate a
real source document.

## Evidence

- Present: `spec/2026-spec/03-chrome-ext-features/README.md` lists
  `14-boot-failure-banner.md`.
- Missing: `spec/2026-spec/03-chrome-ext-features/14-boot-failure-banner.md`.
- Existing code reference: `src/components/popup/BootFailureBanner.tsx` renders
  failed step, cause label, diagnostic report, SQL/migration context, WASM probe,
  click trail snapshot, stack trace, and benign warning tally.
- Existing popup route: `src/pages/Popup.tsx` mounts `BootFailureBanner` directly
  after `VersionMismatchBanner` and before normal popup content.
- Existing shared message shapes: `src/shared/messages.ts` defines
  `BootErrorContext`, `WasmProbeResult`, and boot fields on `StatusResponse`.

## Gap analysis

### G1 — Source spec is missing (Blocker)
An implementing AI cannot read step 14 because the file does not exist. **Fix:**
create `14-boot-failure-banner.md` with the same problem → contract → reference
implementation → pitfalls → acceptance structure as steps 01–13.

### G2 — Boot failure persistence contract is not portable
Memory says boot failures are persisted in a `chrome.storage.local` key and
recovered across service-worker restarts, but the generic spec must not rely on
project-specific names. **Fix:** define a generic key such as
`<extension_prefix>_last_boot_failure` and a `PersistedBootFailure` interface.

### G3 — Failure lifecycle is not sequenced
The implementation pattern is top-level boot `try/catch` → set failed step →
persist details → status handler returns details → popup banner renders details.
This order is not documented in the missing step. **Fix:** specify the exact
write-before-render flow and require that `GET_STATUS` can return the persisted
failure even after MV3 service-worker restart.

### G4 — Code Red fields are not guaranteed for boot failures
Boot failures often include exact failing path or SQL, but the missing spec does
not enforce `path`, `missing`, `Reason`, and `ReasonDetail`. **Fix:** every boot
failure persisted record must include Code Red fields, or explicit `null` plus a
reason such as `BootFailureContextUnavailable`.

### G5 — Cause classification must be deterministic
Current code classifies likely causes (WASM, OPFS, storage quota, migration,
schema, unknown). Without a table, AI implementations will produce inconsistent
labels and recovery steps. **Fix:** add a cause table with ordered matching rules
and stable `kind` values.

### G6 — WASM probe snapshot is memory-only without source-spec ownership
Memory requires HEAD-probe status, content-length, URL, `ok`, and head error in
the banner. The missing step must own this so storage specs can link to it.
**Fix:** define `WasmProbeResult` and require it in persisted failure reports
when the boot sequence reaches the WASM check.

### G7 — Click-trail snapshot vs live trail distinction is not specified
Current behavior freezes recent UI actions at failure time to avoid drift after
the user keeps clicking. **Fix:** define `frozenTrail` semantics: persisted
failure snapshot wins; live trail fallback only in preview/no-storage contexts.

### G8 — Support report format lacks a generic contract
The implementation supports short/full modes, copy, and download. The generic
spec needs minimum report sections so support output is consistent. **Fix:**
require correlation header, failed step, failure id, failure time, cause, Code
Red fields, context, WASM probe, stack, click trail, and benign tally.

### G9 — Timer cleanup is a hidden requirement
Banner copy/download feedback uses `setTimeout`; those timers need cleanup on
unmount/pagehide per timer teardown policy. The missing spec should require
tracked timeouts or a self-cleaning hook.

### G10 — Preview/no-chrome state is unspecified
The banner must be safe in Lovable preview or tests where `chrome.storage` is
absent. **Fix:** require explicit preview state: no crash, no blank popup, report
actions degrade to visible text/manual copy if clipboard or Blob APIs fail.

### G11 — Styling constraints need dark-only semantic tokens
Step 14 is an error surface; direct raw red/black/white styling would violate
the design system. **Fix:** require semantic tokens only (`destructive`,
`background`, `muted`, `border`) and no light-mode toggle.

### G12 — Acceptance and tests are entirely absent
Because the source spec is missing, there are no required tests. **Fix:** add
unit tests for cause classification/report building, component tests for all
render states, storage tests for persisted failure recovery, and E2E/manual
Chrome checks for restart persistence.

## Required source spec outline

The missing `14-boot-failure-banner.md` should contain:

1. **Why this step exists** — bootstrap failure must be visible without DevTools.
2. **Data contract** — `PersistedBootFailure`, `BootErrorContext`,
   `WasmProbeResult`, `ClickTrailEntry`, `BootFailureCause`.
3. **Boot capture flow** — top-level catch, fail-fast persistence, no retry loop.
4. **Status response flow** — status handler merges current boot state with last
   persisted failure.
5. **Banner UI contract** — header, cause badge, recovery steps, context,
   collapsible stack, frozen click trail, WASM probe, report actions.
6. **Support report contract** — short/full reports and required sections.
7. **Pitfalls** — SW restart, invalidated runtime, missing WASM, storage denied,
   stale live click trail, timers, preview mode.
8. **Acceptance/tests** — unit, component, storage, and manual Chrome coverage.

## Time spent

~3 minutes: verified the missing step file, checked the README index, inspected
the current BootFailureBanner mounting/data contracts, and mapped the missing
portable spec requirements from memory and source.

## Remaining audits (post this file)

1. 15-floating-panel-minimize-and-drag
2. 16-sqlite-integration
3. 17-indexeddb-cache
4. 18-chrome-storage-local-usage
5. 19-testing-matrix
6. 20-acceptance-criteria
