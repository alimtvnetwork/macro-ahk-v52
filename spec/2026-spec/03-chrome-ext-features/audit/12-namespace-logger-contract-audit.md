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
