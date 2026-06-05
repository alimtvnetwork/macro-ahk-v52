# 12 — Namespace Logger Contract

## Why this step exists

Step 11 defines what a hard-failure log must contain. This step defines the
single logging path that writes those events. Without a namespace logger
contract, feature code drifts into `console.error()`, bare `log()`, swallowed
catch blocks, incompatible row casing, and page-context logs that never reach
the session database. The result is the same production bug with no reliable
trace. This step makes logging a typed, namespaced API across background,
popup, options, isolated content scripts, and MAIN-world page runtime.

## Contract

1. **Namespace is required.** Every log call includes a stable dot-separated
   namespace such as `Injection.Failed`, `Status.ProbeFailed`, or
   `Replay.VariableFailed`.
2. **Errors use logger APIs only.** Production code must not call bare
   `console.error()`, `console.log()` for errors, or `log()` for errors outside
   the documented allowlist.
3. **MAIN-world runtime uses page logger.** Runtime code injected into the page
   calls `RiseupAsiaMacroExt.Logger.error()`. It must not import background or
   popup logger modules because those contexts are unavailable in MAIN world.
4. **Extension contexts use shared wrappers.** Background, popup, options, and
   isolated content scripts use their context wrapper, all backed by the same
   structured event shape from step 11.
5. **SQLite is source of truth.** DevTools mirroring is a viewing surface only.
   A console-visible error that is not persisted through the logger is invalid.
6. **Casing normalization is mandatory.** Consumers must handle both SQLite
   PascalCase keys and frontend camelCase keys to avoid blank log rows.
7. **No swallowed catches.** Every `catch` must either call the correct logger
   with Code Red context or rethrow to a boundary that does.
8. **Namespace limits are enforced.** `System.*` is reserved for logger/runtime
   internals; `Injection.*`, `Status.*`, `Storage.*`, `Replay.*`, `Recorder.*`,
   and `Reload.*` are feature domains. A build may define at most 25 top-level
   domains, enforced by `scripts/audit-namespaces.mjs`.
9. **Logger failure must not recurse.** If persistence fails, emit through the
   logger's recursion-guarded fallback once and return a typed failure. Do not
   recursively call the same failing logger path.

## Namespace naming rules

Namespaces use PascalCase segments separated by dots:

```text
<Domain>.<ActionOrFailure>
```

Examples:

- `Injection.Failed`
- `Injection.SentinelProbeFailed`
- `Injection.UninjectFailed`
- `Status.ProbeTimeout`
- `Reload.Failed`
- `Replay.VariableFailed`
- `Recorder.SelectorFailed`
- `Storage.KeyMissing`
- `System.Logger.PersistenceFailed`

Rules:

- First segment is the feature/domain.
- Last segment is the event or failure class.
- Do not include dynamic values in the namespace. Put tab id, URL, script id,
  selector, and reason in structured fields.
- Do not use snake_case, kebab-case, or free text namespaces.
- Keep names stable; dashboards and dedupe keys depend on them.

## Context logger map

| Context | Required logger | Error API |
| --- | --- | --- |
| Background service worker | background logger wrapper | `Logger.error(namespace, payload)` / `logBgError(...)` |
| Popup UI | popup logger wrapper | `Logger.error(namespace, payload)` / `logError(...)` |
| Options UI | options logger wrapper | `Logger.error(namespace, payload)` / `logError(...)` |
| Content script, ISOLATED world | content logger wrapper | `Logger.error(namespace, payload)` / relay-backed `logError(...)` |
| Page runtime, MAIN world | `RiseupAsiaMacroExt.Logger` | `RiseupAsiaMacroExt.Logger.error(namespace, payload)` |
| Diagnostics mirror | injection visibility renderer | centralized console group only |

The wrapper names may differ by project, but the behavior cannot differ: every
wrapper must produce the same structured log event fields from step 11.

## Shared logger interface

```ts
// src/shared/logger/types.ts
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface NamespaceLogPayload {
  message: string;
  path?: string;
  missing?: string;
  Reason?: string;
  ReasonDetail?: string;
  buildId: string;
  sourceContext: "background" | "popup" | "options" | "content-isolated" | "page-main";
  tabId: number | null;
  url: string | null;
  stage: string | null;
  triggerSource: string | null;
  SelectorAttempts: SelectorAttemptLog[];
  VariableContext: VariableContextLog[];
}

export interface CodeRedLogPayload extends NamespaceLogPayload {
  path: string;
  missing: string;
  Reason: string;
  ReasonDetail: string;
}

export interface NamespaceLogger {
  debug(namespace: string, payload: NamespaceLogPayload): void;
  info(namespace: string, payload: NamespaceLogPayload): void;
  warn(namespace: string, payload: NamespaceLogPayload): void;
  error(namespace: string, payload: CodeRedLogPayload): void;
}
```

Rules:

- `error()` requires Code Red fields at the type level. If `path`, `missing`,
  `Reason`, or `ReasonDetail` is absent, TypeScript and tests must fail.
- `debug/info/warn` may omit Code Red fields only when they are not failure
  events.
- All levels still include `buildId`, `sourceContext`, and timestamp at write
  time.

## MAIN-world logger bootstrap

The MAIN-world namespace logger is installed during the step 08 namespace
bootstrap and before runtime modules can log.

```ts
// src/content/bootstrap-namespace.iife.ts
(() => {
  globalThis.RiseupAsiaMacroExt ??= {};

  RiseupAsiaMacroExt.Logger = {
    error(namespace, payload) {
      window.dispatchEvent(new CustomEvent("riseupasia:macro-ext:log", {
        detail: {
          level: "error",
          namespace,
          payload,
        },
      }));
    },
  };
})();
```

Rules:

- The page logger emits typed events to the isolated relay; it does not call
  Chrome extension APIs directly.
- If the relay is not ready, the logger buffers a small bounded queue and flushes
  once the relay is linked. The queue must have a fixed cap and must not retry
  forever.
- If the queue cap is exceeded, keep the earliest Code Red item and emit one
  `Logger.BufferOverflow` event when the relay becomes available.

## Isolated relay persistence path

```ts
// src/content/log-relay.ts
const LOG_EVENT = "riseupasia:macro-ext:log";

window.addEventListener(LOG_EVENT, (event) => {
  const customEvent = event as CustomEvent;
  const detail = customEvent.detail as PageLogEnvelope;

  if (!isValidPageLogEnvelope(detail)) {
    return;
  }

  void chrome.runtime.sendMessage({
    kind: "log/write",
    level: detail.level,
    namespace: detail.namespace,
    payload: detail.payload,
  });
});
```

Rules:

- Validate the envelope before forwarding.
- Never forward bearer tokens or private values.
- If validation fails, log one `Logger.InvalidEnvelope` warning through the
  isolated logger, not through the invalid page payload.

## Background write handler

```ts
// src/background/logging/log-message-handler.ts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request?.kind !== "log/write") {
    return false;
  }

  void (async () => {
    const normalized = normalizeLogPayload(request, sender);
    await logStore.insert(normalized);
    mirrorLogToDevTools(normalized);
    sendResponse({ ok: true });
  })().catch((caught) => {
    const err = caught as CaughtError;
    fallbackLoggerErrorOnce("Logger.PersistenceFailed", {
      path: "src/background/logging/log-message-handler.ts",
      missing: "SQLite log row insert",
      Reason: "LoggerPersistenceFailed",
      ReasonDetail: err?.message ?? "Log persistence failed without a message",
    });
    sendResponse({ ok: false, reason: "LoggerPersistenceFailed" });
  });

  return true;
});
```

Rules:

- Normalize sender tab id and URL in the background; do not trust page-provided
  tab ids.
- Insert into SQLite before DevTools mirror where possible.
- Fallback logger is one-shot and recursion-guarded.

## Casing normalization

SQLite rows may expose PascalCase keys while UI code expects camelCase. Every
consumer must normalize before render/export.

```ts
// src/shared/logging/normalize-log-row.ts
export function normalizeLogRow(row: PascalCaseLogRow | CamelCaseLogRow): CamelCaseLogRow {
  return {
    id: row.id ?? row.Id,
    timestamp: row.timestamp ?? row.Timestamp,
    level: row.level ?? row.Level,
    namespace: row.namespace ?? row.Namespace,
    message: row.message ?? row.Message,
    reason: row.reason ?? row.Reason,
    reasonDetail: row.reasonDetail ?? row.ReasonDetail,
  };
}
```

Rules:

- UI components, CSV exports, diagnostics ZIP exports, and status counters must
  use the normalizer.
- Do not fix casing by changing the SQLite schema unless a dedicated migration
  is explicitly planned.
- Blank rendered log lines caused by casing mismatch are a regression.

## Allowed console usage

Direct console calls are allowed only in narrowly documented logger internals:

- recursion-guarded fallback inside logger implementation,
- centralized injection visibility renderer from the diagnostics mirror,
- Chrome `executeScript` page callbacks where the logger is unreachable,
- tests, generated snippets, and documented examples.

Any new allowlist entry must update both the ESLint override and logger audit
script in the same change. A source comment must explain why the logger cannot
be used there.

## Pitfalls

- **Calling `console.error` in feature code** — the error may be visible once in
  DevTools but will be absent from session logs.
- **Importing background logger into MAIN world** — extension modules and Chrome
  APIs are unavailable there. Use `RiseupAsiaMacroExt.Logger`.
- **Using dynamic namespace names** — dedupe, counters, and filters break when
  namespaces contain tab ids or script ids.
- **Persisting only camelCase or only PascalCase consumers** — one side of the
  UI/export pipeline will render blanks.
- **Logger recursion** — if log persistence fails, do not call the same failing
  persistence path again.
- **Swallowing invalid log envelopes** without a diagnostic — emit one warning
  through the relay/logger boundary.

## Acceptance

- [ ] Every production error path uses a namespace logger API, not bare
      `console.error`, `console.log`, or `log()`.
- [ ] MAIN-world runtime errors use `RiseupAsiaMacroExt.Logger.error()`.
- [ ] Background receives page logs through the isolated relay and persists them
      to SQLite.
- [ ] Logger payloads preserve Code Red fields from step 11.
- [ ] Log consumers normalize PascalCase and camelCase rows before rendering or
      exporting.
- [ ] Logger persistence failure uses a one-shot recursion-guarded fallback.
- [ ] ESLint and audit allowlists stay synchronized for any direct console
      exception.

## Tests to ship with this step

- Unit: `namespace-logger-shape.test.ts` — asserts `error()` rejects missing
  Code Red fields.
- Unit: `main-world-logger-relay.test.ts` — asserts `RiseupAsiaMacroExt.Logger`
  emits a valid relay envelope and never calls Chrome APIs directly.
- Unit: `log-row-normalizer.test.ts` — asserts PascalCase and camelCase rows
  render to the same normalized shape.
- Unit: `logger-recursion-guard.test.ts` — asserts persistence failure uses the
  fallback once and does not recurse.
- Static audit: `audit-logger-compliance` — asserts no forbidden console error
  calls or swallowed catches outside the documented allowlist.

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
