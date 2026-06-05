# 03 — Chrome Extension Features (Generic Spec)

A generic, vendor-neutral specification for Manifest V3 Chrome extensions. Any
AI/LLM should be able to read these files top-to-bottom and implement the
described features inside *any* Chromium extension (Chrome / Edge / Brave /
Arc / Opera), without coupling to a specific product.

## How to read

Files are sequenced `01-…`, `02-…`, etc. Read in order. Each step is
self-contained: problem → contract → reference implementation → pitfalls →
acceptance.

## Index (20 steps)

1. `01-purpose-and-scope.md` — what this spec covers, who it is for, and the non-goals.
2. `02-manifest-v3-foundations.md` — MV3 baseline, service worker, MAIN/ISOLATED worlds.
3. `03-folder-and-file-layout.md` — canonical extension source tree.
4. `04-version-display-and-build-stamp.md` — version contract across manifest / constants / UI.
5. `05-extension-reload-manual.md` — user-clickable "Reload Extension" action.
6. `06-extension-reload-auto-on-file-change.md` — dev-mode file watcher + auto reload.
7. `07-status-and-health-panel.md` — reload status, build id, last-error surface.
8. `08-script-injection-lifecycle.md` — 7-stage injection (idle → ready → injected).
9. `09-injection-idempotency-sentinel.md` — `data-marco-injected` style guard, never double-inject.
10. `10-reinject-and-uninject.md` — force re-inject and clean uninject flows.
11. `11-error-logging-discipline.md` — Code-Red error contract (path + missing item + reason).
12. `12-namespace-logger-contract.md` — `Logger.error()` namespace pattern, no bare `console.log`.
13. `13-error-routing-and-panel.md` — error counts, ERROR_COUNT_CHANGED broadcast, errors panel.
14. `14-boot-failure-banner.md` — visible top-level banner when bootstrap fails.
15. `15-floating-in-page-panel.md` — minimize / restore / drag-drop / position persistence.
16. `16-storage-sqlite-pointer.md` — sql.js bundling, per-namespace DB pattern (see `../03-db-and-sqlite-integration-with-chrome-extension/`).
17. `17-indexeddb-cache.md` — injection cache, invalidation on build-id change.
18. `18-chrome-storage-local-usage.md` — when to use `chrome.storage.local` vs SQLite vs IDB.
19. `19-testing-matrix.md` — unit, component, manual Chrome E2E coverage requirements.
20. `20-acceptance-criteria.md` — pass/fail checklist for an implementing AI.

## Cross-references

- `../02-ci-cd-spec-for-chrome-extensions/` — packaging, release, distribution.
- `../03-db-and-sqlite-integration-with-chrome-extension/` — full storage spec.
