---
name: Open Lovable Tabs — per-tab workspace mapping
description: Macro Controller panel lists open Lovable tabs and resolves each tab's workspace via injection map or single-attempt background→page probe (no retry, parallel, 600ms timeout, fail-fast)
type: feature
---

# Open Lovable Tabs → Workspace Mapping

**Spec:** `spec/22-app-issues/111-open-tabs-workspace-mapping.md`
**Status:** Implemented and hardened (v2.249.0, 2026-05-16)

## Contract (must hold)

1. **Transport** — MAIN-world panel never calls `chrome.tabs.*` directly. All traffic flows panel → `window.postMessage` → content-script → `chrome.runtime` → background, and back (mem://architecture/message-relay-system, mem://architecture/injection-context-awareness).
2. **No retry** — every probe is single-attempt, fail-fast, parallel across tabs (`Promise.all`). No retry queue, no exponential backoff (mem://constraints/no-retry-policy).
3. **Hard timeout** — `PROBE_TIMEOUT_MS = 600`. On timeout the row renders a short reason; the panel never blocks.
4. **No new permissions** — only existing `chrome.tabs.sendMessage` + `chrome.tabs.query` with `LOVABLE_TAB_PATTERNS`.
5. **Read-only responder** — page-side responder snapshots `state.workspaceName` / cached id / `extractProjectIdFromUrl()`; MUST NOT mutate state or trigger re-detection.
6. **URL patterns single source** — `src/shared/lovable-tab-patterns.ts` is the only `LOVABLE_TAB_PATTERNS` definition; auto-injector, cookie-watcher, auth-health, config-auth, and open-tabs handler all import from it (v2.249.0 dedupe).
7. **No Explicit Unknown** — `OpenLovableTabInfo.bindingSource` is the union `'injection' | 'probe' | 'none'`; `detectedWorkspaceSource` is `'api' | 'cache' | 'dom' | 'none' | null`.

## Resolution waterfall (per tab)

1. `getTabInjections()[tabId]` → `bindingSource = 'injection'`.
2. Else probe payload `projectId` → `bindingSource = 'probe'`.
3. `projectName = projectsById.get(projectId)` or `null`.
4. If no `projectName` but probe returned `workspaceName` → render amber label with `(api|cache|dom)` source tag.
5. Else render gray italic fallback: truncated `probeError` (≤40 chars + ellipsis, full text in `title` attr) or `"not bound"`.

## Failure-log schema (LOG-1 compliance, v2.248.0)

Background handler classifies every probe failure with `Reason` + `ReasonDetail` and emits via `logBgError(BgLogTag.OPEN_TABS, …)` for non-benign reasons:

| Reason          | Severity | Sink                | When                                                |
|-----------------|----------|---------------------|-----------------------------------------------------|
| `NoTabId`       | Error    | SQLite errors       | `tab.id` is undefined after `chrome.tabs.query`     |
| `NoReceiver`    | Benign   | `console.debug`     | Tab without controller injected (expected)          |
| `EmptyResponse` | Error    | SQLite errors       | `sendMessage` resolved with `undefined`             |
| `ProbeFailed`   | Error    | SQLite errors       | Responder returned `{ isOk: false, errorMessage }`  |
| `Exception`     | Error    | SQLite errors       | `sendMessage` threw a non-`NoReceiver` error        |

`SelectorAttempts[]` / `VariableContext[]` are N/A (no selector or variable resolution involved). `Reason` + `ReasonDetail` pair is still mandatory per Core memory.

## Files

- `src/shared/lovable-tab-patterns.ts` — single source of truth for `LOVABLE_TAB_PATTERNS`.
- `src/background/handlers/open-tabs-handler.ts` — parallel probe + `emitProbeFailure()` classifier.
- `src/background/bg-logger.ts` — `BgLogTag.OPEN_TABS`.
- `src/content-scripts/message-relay.ts` — `PROBE_DETECTED_WORKSPACE` bridge with 600 ms timeout.
- `standalone-scripts/macro-controller/src/page-workspace-responder.ts` — MAIN-world read-only responder.
- `standalone-scripts/macro-controller/src/ui/section-open-tabs.ts` — three-tier label renderer.

## Out of scope

- Persisting probe results across panel openings (always fresh).
- Auto-binding a tab to a stored project on probe success — panel is informational only.
- Per-tab probe latency histograms.

## Deferred (per mem://preferences/deferred-workstreams)

- `page-workspace-responder.test.ts` — React/component-style unit tests are deferred.
- Relay 600 ms timeout test — deferred for the same reason.
