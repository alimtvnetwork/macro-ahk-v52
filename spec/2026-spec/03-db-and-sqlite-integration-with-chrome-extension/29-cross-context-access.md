# Step 29 — Cross-Context Access

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

MV3 extension bugs often come from pretending every context can access every API. Service workers can access extension storage but not the DOM; content scripts can access extension messaging but not page JS globals; MAIN-world injected scripts can access page globals but not extension APIs. The fix is a one-hop message boundary with typed envelopes, explicit drain points, and no direct DB/storage access outside the background.

## Goal

Define the allowed communication paths between background, extension UI, content scripts, and MAIN-world SDK scripts so storage and SQLite operations remain centralized and durable.

## Required files

- `src/shared/message-types.ts` — shared discriminated union for extension messages.
- `src/background/message-router.ts` — only background entry point that may call SQLite/OPFS/IndexedDB/`chrome.storage.local` backends.
- `src/content-scripts/page-bridge.ts` — content-script bridge between isolated world and MAIN world.
- `standalone-scripts/marco-sdk/src/bridge.ts` — SDK-side `window.postMessage` client.
- `src/background/service-worker-main.ts` — registers `chrome.runtime.onSuspend` drain from step-18.
- `src/test/regression/cross-context-access.test.ts` — verifies disallowed paths and envelope validation.

No new runtime package is required.

## Allowed paths

```text
Popup / Options UI
   └─ chrome.runtime.sendMessage(...)
       └─ background/message-router.ts
           └─ SQLite / OPFS / IndexedDB / chrome.storage.local

MAIN-world SDK script
   └─ window.postMessage({ channel: "RISEUP_ASIA_MACRO_SDK", ... })
       └─ content script page-bridge
           └─ chrome.runtime.sendMessage(...)
               └─ background/message-router.ts
```

Forbidden paths:

- MAIN-world SDK → `chrome.runtime` directly.
- Content script → SQLite/OPFS/IndexedDB storage modules directly.
- Popup/Options UI → SQLite manager directly.
- Background → page `window` / DOM / `localStorage`.
- Any context → unauthorized recursive retry or exponential backoff.

## Message envelope

```ts
export type RuntimeMessage<TType extends string, TPayload> = {
    type: TType;
    requestId: string;
    source: "popup" | "options" | "content-script" | "sdk-main-world";
    projectId: string | null;
    payload: TPayload;
};

export type RuntimeResponse<TPayload> = {
    isOk: boolean;
    requestId: string;
    payload?: TPayload;
    errorMessage?: string;
    reason?: string;
    reasonDetail?: string;
};
```

Validation rules:

1. `requestId` is required and echoed in the response.
2. `type` must match a registered router handler.
3. `projectId` must be validated by `requireProjectId()` before any project-scoped DB write.
4. Unknown fields are ignored only after the required fields pass validation; do not cast arbitrary payloads directly into handler types.
5. Every failure response includes `reason` and `reasonDetail`.

## Drain points across contexts

`chrome.runtime.onSuspend` must await background drains:

```ts
chrome.runtime.onSuspend.addListener(() => {
    void (async () => {
        await flushIfDirty();
        await flushAllProjectDbs();
        await closeAllDbs();
    })();
});
```

Important: the async body is intentionally best-effort because Chrome does not guarantee long async work during `onSuspend`. Therefore step-18's 5 s debounce is the primary durability mechanism, and `onSuspend` is the last drain, not the first write strategy.

## Routing contract

```ts
type Handler<TPayload, TResult> = (
    message: RuntimeMessage<string, TPayload>,
) => Promise<RuntimeResponse<TResult>>;

const handlers = new Map<string, Handler<object, object>>();

export async function routeRuntimeMessage(raw: RuntimeMessage<string, object>): Promise<RuntimeResponse<object>> {
    const handler = handlers.get(raw.type);
    if (handler === undefined) {
        return {
            isOk: false,
            requestId: raw.requestId,
            errorMessage: `Unsupported message type: ${raw.type}`,
            reason: "UnsupportedMessageType",
            reasonDetail: `type=${raw.type}`,
        };
    }
    return handler(raw);
}
```

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| Unknown message type | `UnsupportedMessageType` | `MESSAGE_ROUTER` | caller receives `isOk:false` |
| Missing `projectId` | `MissingRequiredField` | handler-specific tag | inline/action error |
| MAIN-world bridge timeout | `BridgeResponseTimeout` | `SDK_BRIDGE` | SDK promise rejects with typed error |
| Background drain failure | `BackgroundDrainFailed` | `DB_FLUSH` / `PROJECT_DB_FLUSH` | Errors panel + BootFailureBanner if persistence is memory-only |

Every bridge failure report must include `Reason`, `ReasonDetail`, `SelectorAttempts: null` when not DOM-related, and `VariableContext: null` when no variables were resolved.

## Acceptance

- [ ] Background is the only context importing DB managers or storage persistence modules.
- [ ] Content script bridge validates `channel`, `requestId`, and message `type` before forwarding.
- [ ] SDK bridge times out fail-fast with one timeout, no retry loop.
- [ ] Unsupported message tests assert `isOk:false`, `reason`, and echoed `requestId`.
- [ ] `chrome.runtime.onSuspend` drains global and per-project DB flushes.
- [ ] No content script or SDK file imports `db-manager`, `project-db-manager`, `db-persistence`, or `chrome-local` wrappers.

## Cross-references

- [step-15](./15-bind-safety-entry-point-guards.md) — handler payload validation.
- [step-18](./18-flush-strategy.md) — dirty flush and drain points.
- [step-27](./27-localstorage-usage.md) — page-origin access limits.
- [step-30](./30-sdk-content-script-contract.md) — detailed SDK bridge contract.
- [step-32](./32-error-routing.md) — routes failures into logs and panel surfaces.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../01-prompt-spec/reference/05-runtime-defaults.md). If a value differs, the SOT wins.

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

