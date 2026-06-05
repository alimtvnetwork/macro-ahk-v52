# 01 — 40 Planning Steps

> The forty ordered planning steps the rest of this spec elaborates.

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md).

---

## §0. The Forty Planning Steps

Each step has a matching `step-NN-*.md` file. The numbering is stable; do not renumber.

1.  Purpose and the "hand to any AI" mindset.
2.  Four-tier storage decision matrix (SQLite / IndexedDB / `chrome.storage.local` / `localStorage`).
3.  Quota, persistence, and eviction characteristics per tier.
4.  Choose-a-tier flowchart with worked examples.
5.  MV3 constraints (no `localStorage`/`window` in the service worker; OffscreenDocument when needed).
6.  Required folder and file layout for the storage layer.
7.  Required NPM packages and the "no remote fetch" policy for `sql-wasm.wasm`.
8.  Bundling `sql-wasm.wasm` into `dist/wasm/` via Vite asset rule + `web_accessible_resources`.
9.  Initializing sql.js with `ensureSqlJs()` and path-aware error reporting.
10. ExtensionDB lifecycle: open → migrate → ready → flush → close.
11. Schema declaration pattern (`CREATE TABLE IF NOT EXISTS` in `db-schemas.ts`).
12. Schema versioning + `Deployments` table + `localStorage` purge on version bump.
13. Migration runner pattern (sequential, idempotent, no down-migrations).
14. Per-project / per-namespace DB pattern (`project-db-manager.ts`).
15. SQLite bind safety — entry-point guards (`requireX`, `bindOpt`, `bindReq`, `safeBind`).
16. SQLite bind safety — global Proxy net (`wrapDatabaseWithBindSafety`, typed `BindError`).
17. Persistence backends: in-memory DB → `chrome.storage.local` blob vs OPFS file.
18. Flush strategy: debounce, `pagehide`/`beforeunload`, shutdown safety.
19. Backup & export: download `.sqlite` dump, SHA-256 integrity hash.
20. Query helpers: prepared statements, parameterized queries, typed row mappers.
21. IndexedDB — when to choose it over `chrome.storage.local`.
22. IndexedDB wrapper pattern (`onupgradeneeded`, transaction helpers, promise wrap).
23. IndexedDB injection cache (script code blobs, version-guarded entries).
24. IndexedDB invalidation: `chrome.runtime.onInstalled` + manual `INVALIDATE_CACHE` message.
25. `chrome.storage.local` usage: small JSON config, cross-context sync.
26. `chrome.storage.local` quota management and `storage-auto-pruner` pattern.
27. `localStorage` usage: bounded UI-only state; banned for logs/tokens.
28. Cross-version storage migration (`storage-migration.ts` pattern).
29. Cross-context access (popup, options, background) via the message bus.
30. SDK contract for content scripts (KV bridge messages, request/response shape).
31. Error model: `BindError`, `QuotaError`, `PathError`, `MigrationError`.
32. Error routing: logger tags, `buildErrorResponse`, no-swallow rule.
33. Errors panel UI hookup (Options → Errors), required context-detail format.
34. `BootFailureBanner` for sql.js init failures (diagnostic paths shown to user).
35. Logging tables: session-log writer schema, retention and pruning policy.
36. Code Red logging rule: every file/path error includes exact path + missing item + reason.
37. Strictly-avoid list: binding `undefined`, logs in `localStorage`, remote `sql-wasm`, etc.
38. Testing: in-memory sql.js, `fake-indexeddb`, vitest setup, fixture seeding.
39. CI gates: schema diff guard, `no-bare-fetch` on `sql-wasm`, storage-audit script.
40. Acceptance criteria and hand-off checklist for any AI implementer.

## Acceptance

- [ ] The implementation satisfies the `01 — 40 Planning Steps` contract in this file and the folder-level acceptance target: SQLite, IndexedDB, chrome.storage.local, and localStorage decisions follow the storage-layer contract.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

