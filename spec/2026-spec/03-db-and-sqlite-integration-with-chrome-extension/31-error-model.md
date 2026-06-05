# Step 31 — Error Model

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The project has had failures that were technically logged but operationally useless: missing path, no reason code, no selector attempts, no variable context, or a raw thrown value that forced the next agent to guess. The fix is a single `CaughtError`-based error model where every failure is typed, normalized, routed, and visible with enough context to repair without reproducing blindly.

## Goal

Define the canonical error shape used by background handlers, storage/SQLite layers, SDK bridge responses, and UI error surfaces.

## Required files

- `src/types/error-model.ts` — shared error and diagnostic types.
- `src/background/bg-logger.ts` — background logging helpers using namespaced logger tags.
- `src/background/message-router.ts` — converts thrown errors into `RuntimeResponse` objects.
- `src/background/sqlite-bind-safety.ts` — `BindError` integrates with this model.
- `src/shared/logger.ts` — namespace logger; no bare `log()` for errors.
- `src/test/regression/error-model.test.ts` — normalization and required-field tests.

No new runtime package is required.

## Canonical types

```ts
export type CaughtError = Error & {
    name: string;
    message: string;
    stack?: string;
};

export type SelectorAttempt = {
    id: string;
    strategy: string;
    expression: string;
    matched: boolean;
    matchCount: number;
    reason: string;
};

export type VariableContextEntry = {
    name: string;
    source: string;
    row: number | null;
    column: string | null;
    resolvedValue: string | number | boolean | null;
    type: string;
    reason: string;
};

export type FailureDiagnostic = {
    Reason: string;
    ReasonDetail: string;
    Path: string;
    Missing: string;
    SelectorAttempts: readonly SelectorAttempt[] | null;
    VariableContext: readonly VariableContextEntry[] | null;
};
```

Notes:

- `CaughtError` is the only approved use of `unknown` narrowing in catch blocks.
- `SelectorAttempts` and `VariableContext` are mandatory fields even when unrelated; use `null` plus a reason, never omit them.
- `resolvedValue` obeys the verbose logging gate: full values only when `Project.VerboseLogging` is ON; otherwise keep existing truncation/masking rules.

## Normalization helper

```ts
export function toCaughtError(error: CaughtError | Error | string): CaughtError {
    if (error instanceof Error) {
        return error as CaughtError;
    }
    return new Error(error) as CaughtError;
}

export function buildFailureDiagnostic(input: {
    reason: string;
    reasonDetail: string;
    path: string;
    missing: string;
    selectorAttempts?: readonly SelectorAttempt[] | null;
    variableContext?: readonly VariableContextEntry[] | null;
}): FailureDiagnostic {
    return {
        Reason: input.reason,
        ReasonDetail: input.reasonDetail,
        Path: input.path,
        Missing: input.missing,
        SelectorAttempts: input.selectorAttempts ?? null,
        VariableContext: input.variableContext ?? null,
    };
}
```

Catch blocks must use this shape:

```ts
try {
    await writeRecord();
} catch (err) {
    const caught = toCaughtError(err as CaughtError);
    RiseupAsiaMacroExt.Logger.error("Db.Write", "write failed", {
        ...buildFailureDiagnostic({
            reason: "DbWriteFailed",
            reasonDetail: caught.message,
            path: "OPFS:logs.sqlite",
            missing: "persisted log row",
        }),
        stack: caught.stack ?? null,
    });
    throw caught;
}
```

## Reason taxonomy

| Area | Reason examples | Surface |
|---|---|---|
| SQLite bind safety | `SQLITE_BIND_ERROR`, `MissingRequiredField` | Errors panel + response error |
| Persistence | `OpfsUnavailable`, `StorageQuotaExceeded`, `DbFlushFailed` | Code Red log; BootFailureBanner for memory mode |
| Cache | `DerivedCacheInvalid`, `StubScriptRejected`, `BuildIdMismatch` | log + automatic cache clear |
| Bridge | `UnsupportedMessageType`, `BridgeResponseTimeout`, `ChromeRuntimeLastError` | caller error + diagnostic row |
| DOM/selector | `SelectorNotFound`, `AmbiguousSelector`, `FrameUnavailable` | failure report with full selector attempts |
| Variables/data | `VariableMissing`, `VariableTypeMismatch`, `DataRowUnavailable` | failure report with variable context |

## User-visible levels

| Level | Meaning | UI |
|---|---|---|
| `debug` | Expected absence or fallback success | no UI |
| `warning` | Degraded but recoverable | toast or panel row |
| `error` | Operation failed | Errors panel row |
| `code-red` | Invariant broken or data durability at risk | Errors panel + BootFailureBanner when boot-critical |

## Non-negotiable rules

1. Use `RiseupAsiaMacroExt.Logger.error()` or approved wrappers; never bare `log()` for errors.
2. Every failure log includes `Reason`, `ReasonDetail`, `Path`, and `Missing`.
3. Selector failures include full `SelectorAttempts[]`; if none were attempted, use `null` and explain in `ReasonDetail`.
4. Variable/data failures include full `VariableContext[]`; if none exists, use `null` and explain in `ReasonDetail`.
5. Do not swallow errors. Catch blocks either log and rethrow, or log and return a typed `isOk:false` response.
6. No recursive retry or exponential backoff.
7. Respect verbose logging and sensitive-field masking.
8. Code Red file/path errors include exact path, missing item, and reasoning.

## Error model for responses

```ts
export type ErrorResponse = {
    isOk: false;
    requestId: string;
    errorMessage: string;
    reason: string;
    reasonDetail: string;
};
```

Every `message-router` handler returns this shape instead of throwing across the Chrome message boundary. Internally, throwing is allowed only until the router catches and normalizes.

## Acceptance

- [ ] `src/types/error-model.ts` exports `CaughtError`, `FailureDiagnostic`, `SelectorAttempt`, and `VariableContextEntry`.
- [ ] All new catch blocks normalize via `toCaughtError()` or an existing approved helper.
- [ ] Message router responses include `reason` and `reasonDetail` on every failure.
- [ ] BindError mapping includes param index, inferred column, and SQL preview.
- [ ] Failure-log tests assert `Reason`, `ReasonDetail`, `Path`, `Missing`, `SelectorAttempts`, and `VariableContext` are present.
- [ ] No error path stores unmasked sensitive values when verbose logging is OFF.

## Cross-references

- [step-16](./16-bind-safety-proxy-net.md) — BindError as specialized error type.
- [step-29](./29-cross-context-access.md) — response envelope uses `reason` and `reasonDetail`.
- [step-32](./32-error-routing.md) — sends normalized errors to logs/UI.
- [step-33](./33-errors-panel-ui-hookup.md) — user-visible error rows.
- [step-36](./36-code-red-logging-rule.md) — Code Red path/missing/reason requirements.
- Core memory: Failure logs mandatory shape, namespace logging, no explicit `unknown`, no-retry policy.

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


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
