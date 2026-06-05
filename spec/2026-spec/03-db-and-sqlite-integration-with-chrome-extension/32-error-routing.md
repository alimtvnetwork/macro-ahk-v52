# Step 32 — Error Routing

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The same low-level failure can appear in several places: a rejected Chrome message, an Errors panel row, a background console entry, or a boot banner. Previous failures became hard to fix because each surface formatted errors differently and some paths skipped the Errors DB entirely. The fix is one routing function that classifies failures once, writes the normalized diagnostic once, and returns a typed response to callers.

## Goal

Route every background/bridge/storage failure through a single normalization path that produces a durable Errors DB row, a typed message response, and optional UI broadcast.

## Required files

- `src/background/message-router.ts` — catches handler errors and calls `buildErrorResponse()`.
- `src/background/error-router.ts` — central classification and persistence helper.
- `src/background/handlers/error-handler.ts` — query/acknowledge errors for UI.
- `src/background/bg-logger.ts` — namespace logging wrappers.
- `src/types/error-model.ts` — `FailureDiagnostic`, `CaughtError`, and response shapes from step-31.
- `src/background/sqlite-bind-safety.ts` — `BindError` classification source.
- `src/test/regression/error-routing.test.ts` — router classification and persistence tests.

No new runtime package is required.

## Routing flow

```text
handler throw / rejected promise
   ↓
message-router buildErrorResponse()
   ↓
error-router classifyError()
   ↓
1. log via RiseupAsiaMacroExt.Logger.error()
2. insert Errors DB row when DB is reachable
3. broadcast ERROR_COUNT_CHANGED when user-visible
4. return RuntimeResponse { isOk:false, reason, reasonDetail }
```

## Canonical API

```ts
type ErrorRouteInput = {
    requestId: string;
    messageType: string;
    source: "popup" | "options" | "content-script" | "sdk-main-world" | "background";
    error: CaughtError;
    diagnostic: FailureDiagnostic;
};

type ErrorRouteResult = {
    response: {
        isOk: false;
        requestId: string;
        errorMessage: string;
        reason: string;
        reasonDetail: string;
    };
    persisted: boolean;
    broadcasted: boolean;
};

export async function routeError(input: ErrorRouteInput): Promise<ErrorRouteResult> {
    const classification = classifyError(input.error, input.diagnostic);

    RiseupAsiaMacroExt.Logger.error(classification.loggerTag, input.error.message, {
        requestId: input.requestId,
        messageType: input.messageType,
        source: input.source,
        ...input.diagnostic,
    });

    const persisted = await insertErrorRowFailSafe({
        requestId: input.requestId,
        messageType: input.messageType,
        source: input.source,
        level: classification.level,
        diagnostic: input.diagnostic,
    });

    const broadcasted = classification.userVisible
        ? await broadcastErrorCountChangedFailSafe()
        : false;

    return {
        response: {
            isOk: false,
            requestId: input.requestId,
            errorMessage: classification.safeMessage,
            reason: input.diagnostic.Reason,
            reasonDetail: input.diagnostic.ReasonDetail,
        },
        persisted,
        broadcasted,
    };
}
```

## Classification table

| Error source | Reason | Logger tag | Persist | Broadcast | User surface |
|---|---|---|---|---|---|
| `BindError` | `SQLITE_BIND_ERROR` | `SQLITE_BIND` | yes | yes | Errors panel |
| missing handler field | `MissingRequiredField` | handler tag | yes | yes | caller + panel |
| OPFS unavailable but fallback succeeds | `OpfsUnavailable` | `DB_PERSISTENCE` | yes | no | diagnostics only |
| all persistence tiers failed | `PersistenceUnavailable` | `DB_PERSISTENCE` | best effort | yes | BootFailureBanner |
| bridge timeout | `BridgeResponseTimeout` | `SDK_BRIDGE` | yes | yes | SDK promise rejection + panel |
| unsupported message | `UnsupportedMessageType` | `MESSAGE_ROUTER` | yes | no | caller response |

## Fail-safe persistence rules

1. Error routing must never recursively throw into itself.
2. If the Errors DB insert fails, log one console/error-router fallback with `Reason="ErrorPersistenceFailed"` and return the original caller response.
3. Do not retry insertion. The no-retry policy applies.
4. Do not drop the caller response just because persistence failed.
5. A Code Red diagnostic must still include exact `Path`, `Missing`, `Reason`, and `ReasonDetail` even when persistence is unavailable.

## Acceptance

- [ ] `message-router.ts` uses `routeError()` for thrown handler failures.
- [ ] `BindError` responses include param index, inferred column, SQL preview, `reason`, and `reasonDetail`.
- [ ] Errors DB insert failure does not hide the original handler error response.
- [ ] `ERROR_COUNT_CHANGED` broadcasts only for user-visible errors.
- [ ] Unsupported message tests assert no recursive retry and no unhandled rejection.
- [ ] Every routed error contains `SelectorAttempts` and `VariableContext`, with `null` only when not applicable.

## Cross-references

- [step-31](./step-31-error-model.md) — canonical diagnostic shape.
- [step-33](./step-33-errors-panel-ui-hookup.md) — consumes persisted errors and broadcasts.
- [step-34](./step-34-boot-failure-banner.md) — boot-critical routing surface.
- [step-36](./step-36-code-red-logging-rule.md) — Code Red minimum fields.
- Memory: SQLite bind safety layer; failure logs mandatory shape; namespace logging.
