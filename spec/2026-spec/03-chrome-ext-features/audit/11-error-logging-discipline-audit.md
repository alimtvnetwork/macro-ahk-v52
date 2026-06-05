# Audit 11 — Error Logging Discipline

- **Source spec**: `../11-error-logging-discipline.md`
- **Audit date**: 2026-06-05
- **Audited against**: `mem://standards/error-logging-requirements.md`,
  `mem://constraints/file-path-error-logging-code-red.md`,
  `mem://standards/error-logging-via-namespace-logger.md`,
  `mem://standards/verbose-logging-and-failure-diagnostics`,
  `mem://architecture/logging-data-contract`,
  `mem://architecture/session-logging-system`,
  `mem://features/log-diagnostics-export`,
  `mem://constraints/no-retry-policy`,
  `mem://standards/unknown-usage-policy`.

## Score: 80 / 100

| Dimension                       | Weight | Score |
|---------------------------------|-------:|------:|
| Clarity of contract             |     25 |    21 |
| Determinism (AI can implement)  |     25 |    19 |
| Completeness of acceptance      |     20 |    16 |
| Cross-references                |     15 |    12 |
| Pitfalls coverage               |     15 |    12 |
| **Total**                       |    100 |  **80** |

## Gap analysis

### G1 — `resolvedValue` type union forbids JSON values (Critical)
`VariableContextLog.resolvedValue: string | number | boolean | null` cannot
represent arrays or objects, which are common variable values (data-row,
JSON-step output). AI implementer will either widen to `unknown` (violates
`mem://standards/unknown-usage-policy`) or stringify silently. **Fix:** use the
project's `JsonValue` type from `mem://architecture/data-type-definitions`:
`resolvedValue: JsonValue | null` and add rule "complex values are
JSON-stringified at the boundary, then truncated per verbose gate".

### G2 — Masking policy is named but not specified
"Sensitive values must be masked" — no list of sensitive field names, no mask
format. **Fix:** add a `SENSITIVE_VARIABLE_PATTERNS` constant:
`/^(password|pwd|token|bearer|secret|api[-_]?key|authorization|cookie|otp|pin|ssn|cvv|card)$/i`
and mask format `"***masked(len=<n>)***"`. Cross-link
`mem://features/form-snapshot-capture` which already defines auto-masking.

### G3 — Truncation limits live in memory but not in spec
Memory says 120/240-char truncation but spec only says "existing limits".
**Fix:** name them: `TRUNC_DEFAULT_CHARS = 120`, `TRUNC_LONG_FIELD_CHARS =
240`, `TRUNC_VERBOSE_DISABLED = true`. List which fields each applies to.

### G4 — Dedup key collides across SW restarts
`(namespace, Reason, path, tabId, stage)` per "session" — session is undefined.
**Fix:** "session = SW lifetime; dedup map keyed in `globalThis
.__codeRedDedup`; reset on SW startup; persisted `repeatCount` increments via
SQL `INSERT ... ON CONFLICT DO UPDATE SET RepeatCount = RepeatCount + 1`".

### G5 — `logCodeRedFailure` calls `Logger.error(namespace, payload)` but step 12 requires the payload to contain `message`
The helper spreads `event` into the second arg; `event.message` is present, so
fine — but `NamespaceLogPayload` in step 12 requires `buildId` and
`sourceContext` which `event` already supplies. **Fix:** drop the manual
`buildId` injection here (step 12 helper does it) OR delete `buildId` from
step 12's wrapper and own it here. Pick one owner; current spec has both.

### G6 — `helper must not throw` but uses `new Date().toISOString()` which can throw on broken `Date` polyfill
Tiny but real. **Fix:** wrap in `try { iso = new Date().toISOString() } catch
{ iso = "1970-01-01T00:00:00.000Z" }`.

### G7 — `path` for SQLite failures has no canonical format
Spec shows `chrome.storage.local[script:sdk-preamble]` (good) but SQLite path
format is verbal-only ("namespace, database, table, statement"). **Fix:**
canonical format `sqlite://<dbName>/<table>#<statementPurpose>` e.g.
`sqlite://session/error_events#insertCodeRed`.

### G8 — Selector `id` semantics ambiguous
`SelectorAttemptLog.id: string | null` — is this the DOM element id, the
selector's order index, or a generated label? **Fix:** rename to `attemptId`
and define "stable per-step label such as `primary`, `fallback-1`,
`text-contains`; never the DOM `[id]` attribute".

### G9 — No path for non-failure diagnostics that still need persistence
Step 11 only covers Code Red. Successful diagnostic events (e.g., "auto-reload
completed", "injection ready") fall through to step 12. **Fix:** add a one-line
note: "non-failure structured diagnostics use `logCodeRedDiagnostic()` with
relaxed Code Red field requirements (path/missing optional, Reason required)".

### G10 — Acceptance lacks a static-audit script name
Memory has `mem://features/error-swallow-audit-generator` →
`scripts/audit-error-swallow.mjs`. Spec just says "static audit forbids bare
`log()`". **Fix:** reference the existing script by exact path and add CI
gate: "fails build if `public/error-swallow-audit.json` has any P0/P1 entry".

### G11 — Missing pitfall: extension-context-invalidated during log write
After auto-reload, `chrome.runtime.sendMessage` throws and the MAIN-world
relay write enters a busy loop unless the queue cap is hit. **Fix:** pitfall
"page logger MUST detect `chrome.runtime?.id` undefined, set
`relay.permanentlyDown = true`, and drop further events silently for that
page lifecycle".

### G12 — Verbose-logging gate is checked in two places (caller + helper) with no clear owner
Causes either double-truncation or no-truncation. **Fix:** the helper is the
sole gate; callers pass raw values; helper reads `Project.VerboseLogging` from
`chrome.storage.local` cached in SW memory (refreshed via
`SAVE_SETTINGS` broadcast per `mem://features/verbose-logging-toggle`).

## Remaining audits (post this turn)

1. 12-namespace-logger-contract
2. 13-error-routing-and-panel
3. 14-floating-button (spec pending)
4. 15-floating-in-page-panel (spec pending)
5. 16-storage-sqlite-pointer (spec pending)
6. 17-storage-indexeddb-pointer (spec pending)
7. 18-storage-chrome-local-pointer (spec pending)
8. 19-testing-matrix (spec pending)
9. 20-acceptance-criteria (spec pending)
