# Step 30 — SDK Content-Script Contract

Part of [`spec/2026-spec/03-db-and-sqlite-integration-with-chrome-extension/`](./README.md) — see [`01-forty-planning-steps.md`](./01-forty-planning-steps.md) for the full ordered outline.

## Root cause this step prevents

The SDK self-test and page-load code previously exposed storage bugs because messages reached background handlers with incomplete payloads, especially missing `projectId`, and handler code tried to bind `undefined` into SQLite. The fix is to make the SDK/content-script bridge responsible for typed envelopes, default SDK namespace identity, correlation IDs, and fail-fast responses before any DB handler sees invalid input.

## Goal

Define the exact SDK ↔ content script ↔ background contract that guarantees required fields, single-path auth, safe KV access, and observable failures.

## Required files

- `standalone-scripts/marco-sdk/src/bridge.ts` — MAIN-world request/response transport.
- `standalone-scripts/marco-sdk/src/kv.ts` — SDK KV API; always sends a project identity.
- `standalone-scripts/marco-sdk/src/auth.ts` — public `getBearerToken()` path.
- `src/content-scripts/page-bridge.ts` — isolated-world relay; validates channel and origin.
- `src/background/message-router.ts` — background handler dispatch and error mapping.
- `src/test/regression/sdk-selftest-handler.test.ts` — regression for SDK self-test payloads.
- `standalone-scripts/marco-sdk/src/bridge.test.ts` — timeout and correlation tests.

No new runtime package is required.

## Constants

```ts
export const SDK_CHANNEL = "RISEUP_ASIA_MACRO_SDK";
export const SDK_DEFAULT_PROJECT_ID = "RiseupMacroSdk";
export const SDK_BRIDGE_TIMEOUT_MS = 5_000;
```

`SDK_DEFAULT_PROJECT_ID` is deliberate: the SDK has self-owned KV data even before a user project is selected. It prevents null/undefined project IDs from reaching SQLite-backed handlers.

## Request envelope

```ts
type SdkBridgeRequest<TPayload> = {
    channel: typeof SDK_CHANNEL;
    direction: "sdk-to-extension";
    requestId: string;
    messageType: "KV_GET" | "KV_SET" | "AUTH_GET_BEARER_TOKEN" | "SELF_TEST";
    projectId: string;
    payload: TPayload;
};

type SdkBridgeResponse<TPayload> = {
    channel: typeof SDK_CHANNEL;
    direction: "extension-to-sdk";
    requestId: string;
    isOk: boolean;
    payload?: TPayload;
    errorMessage?: string;
    reason?: string;
    reasonDetail?: string;
};
```

## SDK-side send helper

```ts
export function sendSdkRequest<TPayload, TResult>(
    messageType: SdkBridgeRequest<TPayload>["messageType"],
    payload: TPayload,
    projectId = SDK_DEFAULT_PROJECT_ID,
): Promise<TResult> {
    const requestId = crypto.randomUUID();
    const request: SdkBridgeRequest<TPayload> = {
        channel: SDK_CHANNEL,
        direction: "sdk-to-extension",
        requestId,
        messageType,
        projectId,
        payload,
    };

    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
            window.removeEventListener("message", onMessage);
            reject(new Error(`SDK bridge timed out: ${messageType}; requestId=${requestId}`));
        }, SDK_BRIDGE_TIMEOUT_MS);

        function onMessage(event: MessageEvent<SdkBridgeResponse<TResult>>): void {
            if (event.source !== window) return;
            const response = event.data;
            if (response.channel !== SDK_CHANNEL || response.requestId !== requestId) return;
            window.clearTimeout(timer);
            window.removeEventListener("message", onMessage);
            if (response.isOk) {
                resolve(response.payload as TResult);
                return;
            }
            reject(new Error(response.errorMessage ?? response.reason ?? "SDK bridge request failed"));
        }

        window.addEventListener("message", onMessage);
        window.postMessage(request, window.location.origin);
    });
}
```

## Content-script relay rules

1. Accept messages only when `event.source === window`.
2. Require `channel === SDK_CHANNEL` and `direction === "sdk-to-extension"`.
3. Require non-empty `requestId`, `messageType`, and `projectId`.
4. Forward to `chrome.runtime.sendMessage()` with source `sdk-main-world`.
5. Echo the same `requestId` back to the page.
6. Convert `chrome.runtime.lastError` into `isOk:false` with `Reason="ChromeRuntimeLastError"`.
7. Do not retry bridge messages. Caller may issue a new request explicitly.

## KV contract

```ts
export async function kvGet(key: string, projectId = SDK_DEFAULT_PROJECT_ID): Promise<string | null> {
    if (key.trim() === "") {
        throw new Error("KV key is required");
    }
    return sendSdkRequest<{ key: string }, string | null>("KV_GET", { key }, projectId);
}

export async function kvSet(key: string, value: string, projectId = SDK_DEFAULT_PROJECT_ID): Promise<void> {
    if (key.trim() === "") {
        throw new Error("KV key is required");
    }
    await sendSdkRequest<{ key: string; value: string }, { saved: true }>("KV_SET", { key, value }, projectId);
}
```

Background handlers still run `requireProjectId()` and `requireKey()`; SDK defaults are not a substitute for server-side/background validation.

## Error model

| Failure | Reason | Logger tag | User-visible surface |
|---|---|---|---|
| Missing project id before relay | `MissingRequiredField` | `SDK_BRIDGE` | SDK promise rejects |
| Bridge timeout | `BridgeResponseTimeout` | SDK console + optional diagnostic row | SDK promise rejects |
| Runtime disconnected | `ChromeRuntimeLastError` | `SDK_BRIDGE` | SDK promise rejects |
| Handler rejects payload | handler reason, e.g. `MissingRequiredField` | handler tag | SDK promise rejects with response error |
| BindError reaches router | `SQLITE_BIND_ERROR` | `SQLITE_BIND` | Errors panel row with column + SQL preview |

Failure reports must include `requestId`, `messageType`, `projectId`, `Reason`, and `ReasonDetail`. For non-DOM failures, log `SelectorAttempts: null`. For requests with no variables, log `VariableContext: null`.

## Acceptance

- [ ] SDK KV self-test sends `projectId: "RiseupMacroSdk"`.
- [ ] Content-script relay rejects missing `requestId`, `messageType`, or `projectId` before forwarding.
- [ ] Background handlers still validate with `requireProjectId()` / `requireKey()`.
- [ ] Bridge timeout is exactly one fail-fast timeout, not a retry loop.
- [ ] Response always echoes the request ID.
- [ ] Regression test proves no SDK self-test path can bind `undefined` into SQLite.
- [ ] No SDK file imports extension background modules directly.

## Cross-references

- [step-15](./15-bind-safety-entry-point-guards.md) — required field guards.
- [step-16](./16-bind-safety-proxy-net.md) — last-resort BindError defense.
- [step-27](./27-localstorage-usage.md) — auth reads remain behind `getBearerToken()`.
- [step-29](./29-cross-context-access.md) — context boundary diagram.
- Memory: SQLite bind safety layer and single-path auth contract.

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

