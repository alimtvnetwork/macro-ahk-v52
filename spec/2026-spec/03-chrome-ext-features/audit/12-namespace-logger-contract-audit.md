# Audit 12 — Namespace Logger Contract

- **Source spec**: `../12-namespace-logger-contract.md`
- **Audit date**: 2026-06-05
- **Audited against**: `mem://standards/error-logging-via-namespace-logger.md`,
  `mem://features/namespace-database-creation`,
  `mem://architecture/logging-data-contract`,
  `mem://architecture/session-logging-system`,
  `mem://architecture/message-relay-system`,
  `mem://architecture/injection-context-awareness`,
  `mem://architecture/extension-error-management`,
  `mem://architecture/real-time-error-synchronization`,
  `mem://standards/unknown-usage-policy`,
  `mem://constraints/no-retry-policy`.

## Score: 76 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 |    20 |
| Determinism (AI can implement)  |     25 |    18 |
| Completeness of acceptance      |     20 |    15 |
| Cross-references                |     15 |    11 |
| Pitfalls coverage               |     15 |    12 |
| **Total**                       |    100 |  **76** |

## Gap analysis

### G1 — Namespace cap and `System.*` reservation missing (Critical)
Per `mem://features/namespace-database-creation`: max 25 namespaces, `System.*`
reserved. Spec mentions `Logger.PersistenceFailed`, `Logger.BufferOverflow`,
`Logger.InvalidEnvelope` — these should be `System.Logger.*`. **Fix:** add
"reserved prefixes: `System.*` (logger internals), `Injection.*`, `Status.*`,
`Storage.*`, `Replay.*`, `Recorder.*`, `Reload.*`. Max 25 distinct top-level
domains; enforced by `scripts/audit-namespaces.mjs`".

### G2 — `NamespaceLogger.error()` signature lets debug/info skip Code Red — runtime check vs type check ambiguous (Critical)
Spec says "tests must fail" when error() payload lacks `path/missing/Reason/
ReasonDetail`, but `NamespaceLogPayload` marks them optional (`path?: string`).
AI implementer will not enforce. **Fix:** split into two payload types —
`NamespaceLogPayload` (info/debug/warn, fields optional) and
`CodeRedLogPayload extends Required<Pick<...,'path'|'missing'|'Reason'|'ReasonDetail'>>`;
`error()` accepts only `CodeRedLogPayload`. TypeScript enforces; tests are
backstop.

### G3 — `LOG_EVENT` string duplicates `RELAY_EVENT` from step 08
Two custom-event channels on `window` doubles structured-clone overhead. **Fix:**
either (a) reuse `RELAY_EVENT` with `envelope.kind = "log/write"` discriminator,
or (b) document why a separate channel is required (priority/buffering).
Recommend (a).

### G4 — MAIN-world logger bootstrap re-defines `RiseupAsiaMacroExt` ignoring step 08's bootstrap
Step 08 already initializes the namespace with `BuildId`, `Logger: null`,
`Runtime: null`, `require: null`. This snippet does `globalThis
.RiseupAsiaMacroExt ??= {}` — loses the BuildId/Runtime/require fields if it
runs first. **Fix:** assert "MUST run after step 08 bootstrap; assigns
`RiseupAsiaMacroExt.Logger` only; throws `System.Logger.BootstrapOrderViolation`
if `RiseupAsiaMacroExt.BuildId` is missing".

### G5 — Queue cap, flush-on-link, and "keep earliest Code Red" conflict
Spec says "keep the earliest Code Red item" on overflow. That drops everything
after, including later more-actionable failures. **Fix:** ring-buffer policy:
"cap = 64 events; on overflow, drop oldest *info/debug/warn* first; never drop
`error` until cap of 16 errors is hit; then drop oldest error and emit one
`System.Logger.BufferOverflow` with `droppedCount`".

### G6 — `sendResponse({ok:true})` after async insert is racy in MV3
`return true` keeps the channel open, but `await logStore.insert(...)` resolves
in microtask; if SW suspends mid-await the response never arrives, and the page
relay treats it as a silent loss. **Fix:** explicitly note "fire-and-forget;
no ack expected from page logger; relay does NOT block on response". Remove
`sendResponse` from the contract or make it diagnostics-only.

### G7 — Casing normalizer reads both `row.namespace` and `row.Namespace` but `SqlValue` rows are typed
Per `mem://architecture/data-type-definitions` SQLite values are `SqlValue`.
The `PascalCaseLogRow | CamelCaseLogRow` union types are never defined.
**Fix:** provide both interfaces explicitly with their PascalCase column names
matching the SQL schema (`Id`, `Timestamp`, `Level`, `Namespace`, `Message`,
`Reason`, `ReasonDetail`, `PayloadJson`).

### G8 — Allowed-console rule references "ESLint override and logger audit script" but neither is named
**Fix:** name them: `eslint.config.js` rule `no-restricted-syntax` with id
`logger-allowlist`; audit script `scripts/audit-logger-compliance.mjs`. Both
read `src/shared/logger/allowlist.json` (single source of truth).

### G9 — Real-time error sync (memory: `ERROR_COUNT_CHANGED`) not mentioned
Spec persists to SQLite + mirrors to DevTools but skips the broadcast that
updates the Errors row in the Status panel. **Fix:** after successful insert,
SW MUST `chrome.runtime.sendMessage({ kind: "ERROR_COUNT_CHANGED", delta: 1
})` per `mem://architecture/real-time-error-synchronization`. Cross-link
audit 07 G8 (errors-row click target).

### G10 — Recursion-guarded fallback has no concrete impl
"Emit through fallback once" — fallback is undefined. **Fix:** specify:
```ts
let inFallback = false;
function fallbackLoggerErrorOnce(ns, payload) {
  if (inFallback) return;
  inFallback = true;
  try { console.error(`[FALLBACK ${ns}]`, payload); } finally { inFallback = false; }
}
```
This is the only allowed `console.error` in production code.

### G11 — Pitfall missing: extension-context-invalidated for the isolated relay
After auto-reload, `chrome.runtime.sendMessage` from the relay throws. Without
a kill-switch, every page log triggers a console exception. **Fix:** mirror
audit 11 G11 — relay sets `permanentlyDown` on first `Extension context
invalidated`, drops further events silently for that page lifecycle, emits
zero further logs.

### G12 — Acceptance lacks an end-to-end log-roundtrip test
**Fix:** add E2E acceptance "manual: trigger `RiseupAsiaMacroExt.Logger.error
('Test.RoundTrip', {...})` from page console → row appears in SQLite within
500 ms → Errors counter in Status panel increments → Errors panel shows the
row with PascalCase→camelCase normalization".

## Remaining audits (post this turn)

1. 13-error-routing-and-panel
2. 14-floating-button (spec pending)
3. 15-floating-in-page-panel (spec pending)
4. 16-storage-sqlite-pointer (spec pending)
5. 17-storage-indexeddb-pointer (spec pending)
6. 18-storage-chrome-local-pointer (spec pending)
7. 19-testing-matrix (spec pending)
8. 20-acceptance-criteria (spec pending)

## Acceptance

- [ ] The implementation satisfies the `Audit 12 — Namespace Logger Contract` contract in this file and the folder-level acceptance target: each audit finding remains traceable to a feature spec and a verification hook.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every extension numeric (alarm intervals, debounce ms, retry counts=0, sentinel TTL, badge text limits) to a constant in `src/shared/constants.ts` or a local `*-defaults.ts` module. Inline literals are rejected by code review.
- **MUST** gate auto-injector and project-matcher with `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` — never run on `about:blank`, `chrome://newtab/`, or empty URLs (see `mem://features/new-tab-no-url-guard`).
- **MUST** route every failure through `RiseupAsiaMacroExt.Logger.error` with `Reason`+`ReasonDetail` and surface boot-time failures via `BootFailureBanner`. Bare `console.error` is rejected by `public/logger-compliance-audit.json`.
- **MUST** pair every `setInterval` / `setTimeout` / `MutationObserver` / event listener with a teardown registered on `pagehide` (see `mem://standards/timer-and-observer-teardown`). Tick UIs MUST pause on `document.hidden`.

## Pitfalls / Counter-examples

- ❌ `catch (caught) { /* ignore */ }` around `chrome.runtime.sendMessage`. ✅ `Logger.error('scope', 'send failed', caught)` and re-throw (see `public/error-swallow-audit.json`).
- ❌ Calling `chrome.scripting.executeScript` on a new-tab URL because the matcher did not gate it. ✅ Always call `isNewTabOrBlankUrl(tab.url)` first; treat true as a non-error skip.
- ❌ Storing a timestamp as `new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })`. ✅ Store `Date.now()` ms UTC; render with `Intl.DateTimeFormat().resolvedOptions().timeZone` (see `mem://localization/timezone`).
- ❌ Retrying `fetch` with `for (let i=0;i<3;i++)` and exponential backoff after a 4xx/5xx. ✅ Use `httpFetchOrThrow` / `httpFailFast` from `src/shared/http-fail-fast.ts`; one attempt, then halt (see `.lovable/checklists/http-fail-fast.md`).
- ❌ Injecting the same content-script twice because the sentinel check was skipped. ✅ Read `#marco-css-sentinel` / data-attribute sentinel before re-injection (see `09-injection-idempotency-sentinel.md`).

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

