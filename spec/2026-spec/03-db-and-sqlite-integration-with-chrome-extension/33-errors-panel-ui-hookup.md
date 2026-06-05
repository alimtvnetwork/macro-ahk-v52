# Step 33 — Errors Panel UI Hookup

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

Errors that only appear in DevTools are invisible to normal operators, while errors that appear as generic red toasts are not actionable. The project already has a strict diagnostic shape; the UI must show that shape without truncating away the fields needed to fix the issue. The fix is an Errors panel that reads the Errors DB, updates on `ERROR_COUNT_CHANGED`, and exposes Code Red details directly.

## Goal

Wire routed background errors into the popup/options Errors panel with durable rows, unread counts, reason filters, and copyable diagnostics.

## Required files

- `src/background/handlers/error-handler.ts` — `GET_ERRORS`, `ACK_ERROR`, `CLEAR_DISPOSABLE_ERRORS` handlers.
- `src/popup/components/DebugPanel.tsx` — renders recent error count/summary.
- `src/popup/hooks/useDebugPanel.ts` — subscribes to `ERROR_COUNT_CHANGED`.
- `src/options/options-entry.tsx` or existing options diagnostics surface — full Errors panel if popup only shows summary.
- `src/shared/message-types.ts` — error query and broadcast message types.
- `src/types/error-model.ts` — row shape and diagnostic fields.
- `src/pages/__tests__/Popup.test.tsx` or options component test — verifies display.

No new runtime package is required.

## User-facing row shape

```ts
type ErrorPanelRow = {
    id: string;
    createdAt: string;
    level: "warning" | "error" | "code-red";
    source: string;
    messageType: string;
    reason: string;
    reasonDetail: string;
    path: string;
    missing: string;
    selectorAttemptsJson: string | null;
    variableContextJson: string | null;
    isAcked: boolean;
};
```

The panel must display these columns or equivalent labels:

| Field | Why it matters |
|---|---|
| `createdAt` | locate the failing action |
| `level` | distinguish degraded vs Code Red |
| `source` + `messageType` | find the caller path |
| `reason` | filter stable failure classes |
| `reasonDetail` | explain exact failure |
| `path` | exact file/storage/API path |
| `missing` | exact item that was expected |

## Query contract

```ts
type GetErrorsPayload = {
    limit: number;
    includeAcked: boolean;
    level?: "warning" | "error" | "code-red";
    reason?: string;
};

type GetErrorsResult = {
    rows: readonly ErrorPanelRow[];
    unreadCount: number;
    codeRedCount: number;
};
```

Rules:

1. Default `limit` is 50; maximum is 500.
2. The UI must request unacked rows first.
3. Acknowledging an error only flips `isAcked`; it does not delete the row.
4. Clearing is allowed only for disposable/generated test errors, not Code Red history.
5. Copy Report includes raw `SelectorAttempts` and `VariableContext` JSON.

## Broadcast hookup

```ts
chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "ERROR_COUNT_CHANGED") {
        return;
    }
    void refreshErrors();
});
```

Use optional property access and guard clauses; do not assume arbitrary runtime messages have a complete shape.

## Visual rules

- Dark-only theme.
- Code Red rows use the established danger tone, not a new one-off palette.
- Long `reasonDetail`, `path`, and SQL preview text wrap; they must not overflow the panel.
- Do not nest cards inside cards. The panel can be a table/list inside the existing debug surface.
- Copy buttons use icon+tooltip where the existing UI has icons.

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| Error query fails | `ErrorPanelQueryFailed` | `ERROR_PANEL` | inline panel failure row |
| Acknowledge fails | `ErrorAckFailed` | `ERROR_PANEL` | toast/panel error |
| Broadcast missed | no error; next poll/query refreshes | none | stale until next open/refresh |
| Malformed row JSON | `ErrorDiagnosticParseFailed` | `ERROR_PANEL` | show raw string fallback |

UI failures must not create infinite error-routing loops. If the panel itself cannot render a diagnostic, show the raw row fields and log once.

## Acceptance

- [ ] Errors panel lists newest unacked errors with reason, detail, path, and missing item visible.
- [ ] `ERROR_COUNT_CHANGED` refreshes counts without page reload.
- [ ] Code Red rows remain visible until acknowledged; acknowledgement does not delete them.
- [ ] Copy Report includes `SelectorAttempts` and `VariableContext` exactly as stored.
- [ ] Malformed diagnostic JSON renders a safe fallback instead of crashing the panel.
- [ ] Component tests cover empty, warning, error, Code Red, long path, and malformed JSON states.

## Cross-references

- [step-31](./31-error-model.md) — row fields come from the canonical diagnostic.
- [step-32](./32-error-routing.md) — source of persisted rows and broadcasts.
- [step-34](./34-boot-failure-banner.md) — boot-critical errors also appear here.
- [step-35](./35-logging-tables-and-retention.md) — table schema and retention.
- Core memory: Dark-only theme; failure logs mandatory shape; namespace logging.

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
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

