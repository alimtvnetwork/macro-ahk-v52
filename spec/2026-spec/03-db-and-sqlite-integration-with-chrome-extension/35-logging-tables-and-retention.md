# Step 35 — Logging Tables and Retention

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

Logs become useless when they are either too short-lived to inspect or retained forever until quota failures break the extension. This project needs durable, queryable SQLite rows for active debugging plus OPFS session files for export, with explicit pruning so diagnostics do not become the next storage incident.

## Goal

Define SQLite logging tables, OPFS session log files, retention windows, and pruning rules for logs, errors, scripts, and diagnostic exports.

## Required files

- `src/background/db-schema.ts` — `Logs` and `Errors` table definitions.
- `src/background/handlers/logging-handler.ts` — writes general log rows.
- `src/background/handlers/error-handler.ts` — writes/queries/acks error rows.
- `src/background/session-log-writer.ts` — OPFS file writer under `session-logs/session-{id}/`.
- `src/background/log-retention.ts` — pruning logic.
- `src/background/log-diagnostics-export.ts` — ZIP/report export reads DB + OPFS logs.
- `src/test/regression/sessions-logging-path.test.ts` — path and retention tests.

No new runtime package is required.

## SQLite tables

```sql
CREATE TABLE IF NOT EXISTS Logs (
    Id TEXT PRIMARY KEY,
    CreatedAt TEXT NOT NULL,
    Level TEXT NOT NULL,
    Source TEXT NOT NULL,
    Message TEXT NOT NULL,
    Reason TEXT,
    ReasonDetail TEXT,
    SessionId TEXT,
    ProjectId TEXT,
    MetadataJson TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON Logs (CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_logs_session ON Logs (SessionId, CreatedAt DESC);

CREATE TABLE IF NOT EXISTS Errors (
    Id TEXT PRIMARY KEY,
    CreatedAt TEXT NOT NULL,
    Level TEXT NOT NULL,
    Source TEXT NOT NULL,
    MessageType TEXT NOT NULL,
    Message TEXT NOT NULL,
    Reason TEXT NOT NULL,
    ReasonDetail TEXT NOT NULL,
    Path TEXT NOT NULL,
    Missing TEXT NOT NULL,
    SelectorAttemptsJson TEXT,
    VariableContextJson TEXT,
    RequestId TEXT,
    SessionId TEXT,
    ProjectId TEXT,
    IsAcked INTEGER NOT NULL DEFAULT 0,
    MetadataJson TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_errors_created_at ON Errors (CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_errors_unacked ON Errors (IsAcked, CreatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_errors_reason ON Errors (Reason, CreatedAt DESC);
```

PascalCase table/column names are intentional for SQLite logging compatibility. Frontend mapping may expose camelCase DTOs, but storage keys in `chrome.storage.local` must not be PascalCase-migrated.

## OPFS session log layout

```text
session-logs/
  session-{sessionId}/
    events.log
    errors.log
    scripts.log
```

Rules:

1. One directory per session.
2. Line-delimited JSON for file logs.
3. `events.log` stores lifecycle/action events.
4. `errors.log` mirrors normalized error diagnostics.
5. `scripts.log` stores script injection/execution audit entries.
6. Full HTML/text payloads are stored only when `Project.VerboseLogging` is ON; otherwise preserve existing truncation.

## Retention policy

| Store | Retention | Prune trigger | Protected rows |
|---|---:|---|---|
| OPFS `session-logs/session-*` | 7 days | new session initialization | current session |
| `Logs` table | 14 days or 10,000 rows | boot + new session | current session rows |
| `Errors` warning/error acked rows | 30 days or 5,000 rows | boot + panel open | unacked rows |
| `Errors` Code Red rows | 90 days | boot only | unacked Code Red rows |
| Diagnostic export artifacts | user-owned | never auto-delete from user downloads | n/a |

Pruning is sequential and fail-fast per store. Do not use recursive retries or exponential backoff.

## Prune helper

```ts
export async function pruneLogs(nowIso: string): Promise<void> {
    await pruneOpfsSessionDirectories({
        rootPath: "session-logs",
        olderThanDays: 7,
        protectCurrentSession: true,
    });

    await logsDb.run(
        "DELETE FROM Logs WHERE CreatedAt < ? AND SessionId <> ?",
        [isoDaysAgo(nowIso, 14), currentSessionId],
    );

    await errorsDb.run(
        `DELETE FROM Errors
         WHERE IsAcked = 1
           AND Level <> 'code-red'
           AND CreatedAt < ?`,
        [isoDaysAgo(nowIso, 30)],
    );
}
```

All SQLite bind params must pass through the bind-safety layer; no `undefined` values.

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| OPFS session log write fails | `SessionLogWriteFailed` | `SESSION_LOG` | Errors panel row |
| SQLite log insert fails | `LogInsertFailed` | `LOGGING_HANDLER` | console fallback + Errors panel if reachable |
| Retention prune fails | `LogRetentionPruneFailed` | `LOG_RETENTION` | warning row |
| Export cannot read log file | `DiagnosticExportLogReadFailed` | `DIAGNOSTIC_EXPORT` | export failure message |

Every failure includes exact path, e.g. `OPFS:session-logs/session-{id}/errors.log`, and the missing operation, e.g. `append normalized error line`.

## Acceptance

- [ ] `Logs` and `Errors` tables exist with indexes above.
- [ ] OPFS session logs use `session-logs/session-{id}/events.log`, `errors.log`, and `scripts.log`.
- [ ] New session initialization prunes OPFS session directories older than 7 days.
- [ ] Error rows retain `Reason`, `ReasonDetail`, `Path`, `Missing`, `SelectorAttemptsJson`, and `VariableContextJson`.
- [ ] Verbose logging gate controls full HTML/text payloads.
- [ ] Retention tests prove unacked Code Red rows are not pruned.
- [ ] Diagnostic export includes both SQLite rows and OPFS files for the selected session.

## Cross-references

- [step-17](./17-persistence-backends.md) — DB persistence waterfall.
- [step-18](./18-flush-strategy.md) — dirty flush and export drain.
- [step-31](./31-error-model.md) — normalized diagnostic fields.
- [step-33](./33-errors-panel-ui-hookup.md) — UI consumes `Errors` rows.
- Memory: Session logging system; verbose logging gate; failure logs mandatory shape.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, quotas, retention, byte caps, chunk sizes) to a named constant declared in `spec/2026-spec/01-prompt-spec/reference/05-runtime-defaults.md` or a local `reference/*-defaults.md` file. Inline literals are rejected.
- **MUST** keep `chrome.storage.local` per-key payloads ≤ `CHROME_STORAGE_LOCAL_PER_KEY_BYTES` (8 192) and aggregate writes ≤ `CHROME_STORAGE_LOCAL_TOTAL_BYTES` (10 485 760). Larger payloads route to IndexedDB or SQLite.
- **MUST** await `navigator.storage.persist()` once at boot, log the resolved boolean via `RiseupAsiaMacroExt.Logger.info`, and surface `{ persisted, usage, quota }` in diagnostics — no fire-and-forget.
- **MUST** classify every DB failure with a stable `Reason` code (see `31-error-model.md`) plus `ReasonDetail`, and route it through `Logger.error` — never `console.error` and never silently swallow.

## Pitfalls / Counter-examples

- ❌ `catch (e) { /* ignored */ }` around `db.exec()` — masks corruption; the error-swallow audit (`public/error-swallow-audit.json`) will fail CI. ✅ Re-throw after `Logger.error` with full SQL + bind context.
- ❌ Calling `db.run` on a new-tab/blank URL because the auto-injector did not gate the URL. ✅ Use `isNewTabOrBlankUrl()` from `src/shared/url-utils.ts` before scheduling any DB-bound work.
- ❌ Hardcoding `Asia/Kuala_Lumpur` (or any zone) when persisting timestamps. ✅ Store `Date.now()` as UTC ms; render with `Intl.DateTimeFormat(undefined, { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })`.
- ❌ Treating `chrome.storage.local.set` as synchronous and reading back in the next line. ✅ Always `await` the Promise (MV3) and verify the write via `storage.local.get` in tests.
- ❌ Retrying a failed migration with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy` — surface a Boot Failure Banner (`34-boot-failure-banner.md`) and require user action.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

