# 08 — Script Injection Lifecycle

## Why this step exists

Script injection is the highest-risk path in an MV3 extension: it crosses the
service worker, Chrome permission gates, tab lifecycle, page worlds, content
security policy, and app runtime. If every feature injects scripts in its own
way, bugs become non-reproducible: duplicate panels, half-loaded namespaces,
missing relays, swallowed errors, and page-specific breakage. This step defines
one injection pipeline that all popup buttons, auto-injection, reload flows, and
future re-injection controls must use.

## Contract

1. **Single entry point.** Every manual or automatic injection request MUST go
   through `injectIntoTab()` in the background service worker. No popup,
   options page, or content script may call `chrome.scripting.executeScript()`
   directly.
2. **MV3 primitive only.** Injection uses `chrome.scripting.executeScript()`
   from the background service worker. DOM `<script>` tag injection is forbidden
   unless the CSP fallback stage explicitly authorizes it for a single file.
3. **MAIN-world SDK.** Runtime scripts that need the page's JS context are
   injected into `world: "MAIN"`. The `RiseupAsiaMacroExt` SDK namespace exists
   only in that target page MAIN world, never in the popup, options page, or
   service worker.
4. **ISOLATED-world relay.** If extension-to-page messaging is needed, install
   the relay content script in the isolated world before MAIN-world runtime
   scripts execute.
5. **New-tab guard first.** `isNewTabOrBlankUrl()` is checked before URL
   matching, dependency resolution, storage reads, or any `chrome.scripting`
   call. New-tab and blank pages are a normal no-op, not an error.
6. **Seven ordered stages.** The lifecycle is fixed and must not be skipped:
   1. Dependency resolution
   2. Namespace bootstrapping
   3. Relay installation
   4. IIFE execution
   5. Script-to-script communication setup
   6. CSP fallback handling
   7. Dynamic loading at runtime
7. **Fail-fast, no retry.** A failed stage stops the pipeline immediately,
   writes one Code Red row, and returns a typed failure result. No recursive
   retry, exponential backoff, or silent second attempt is allowed.
8. **Idempotency is delegated to step 09.** This step defines the pipeline; the
   sentinel that prevents double injection is specified in
   `09-injection-idempotency-sentinel.md` and must be checked before stage 1.
9. **Every failure logs Code Red shape.** The log MUST include `Reason`,
   `ReasonDetail`, exact `path`, missing item, tab id, URL decision, build id,
   current stage, and selector/variable diagnostic arrays when applicable.

## Lifecycle states

```ts
// src/background/injection/types.ts
export type InjectionStage =
  | "idle"
  | "guarded"
  | "resolving-dependencies"
  | "bootstrapping-namespace"
  | "installing-relay"
  | "executing-iife"
  | "linking-runtime"
  | "handling-csp-fallback"
  | "ready"
  | "failed";

export interface InjectionRequest {
  tabId: number;
  url: string;
  triggerSource: "auto" | "popup" | "status-panel" | "keyboard-shortcut";
  force?: boolean;
}

export interface InjectionSuccess {
  ok: true;
  tabId: number;
  stage: "ready";
  injectedScriptIds: string[];
  buildId: string;
}

export interface InjectionFailure {
  ok: false;
  tabId: number;
  stage: InjectionStage;
  reason: string;
  reasonDetail: string;
  buildId: string;
}

export type InjectionResult = InjectionSuccess | InjectionFailure;
```

## Stage 0 — guard and sentinel check

Before the seven stages begin, the background handler validates the target tab.
This protects Chrome internal pages and avoids noisy permission errors.

```ts
// src/background/injection/injector.ts
import { BUILD_ID } from "@shared/constants";
import { Logger } from "@shared/logger";
import { isNewTabOrBlankUrl } from "@shared/url-utils";
import { isAlreadyInjected } from "./sentinel";
import { resolveInjectionPlan } from "./script-resolver";
import type { InjectionRequest, InjectionResult, InjectionStage } from "./types";

export async function injectIntoTab(request: InjectionRequest): Promise<InjectionResult> {
  let stage: InjectionStage = "idle";

  try {
    if (isNewTabOrBlankUrl(request.url)) {
      return {
        ok: false,
        tabId: request.tabId,
        stage: "guarded",
        reason: "NewTabOrBlankUrl",
        reasonDetail: `Injection skipped for url=${request.url}`,
        buildId: BUILD_ID,
      };
    }

    if (!request.force && await isAlreadyInjected(request.tabId)) {
      return {
        ok: true,
        tabId: request.tabId,
        stage: "ready",
        injectedScriptIds: [],
        buildId: BUILD_ID,
      };
    }

    stage = "resolving-dependencies";
    const plan = await resolveInjectionPlan(request.url);

    stage = "bootstrapping-namespace";
    await executeFile(request.tabId, "src/content/bootstrap-namespace.iife.js", "MAIN");

    stage = "installing-relay";
    await executeFile(request.tabId, "src/content/isolated-relay.js", "ISOLATED");

    stage = "executing-iife";
    for (const file of plan.mainWorldFiles) {
      await executeFile(request.tabId, file, "MAIN");
    }

    stage = "linking-runtime";
    await chrome.tabs.sendMessage(request.tabId, { kind: "injection/link-runtime", buildId: BUILD_ID });

    stage = "handling-csp-fallback";
    await runCspFallbackIfRequired(request.tabId, plan.cspFallbackFiles);

    stage = "ready";
    return {
      ok: true,
      tabId: request.tabId,
      stage,
      injectedScriptIds: plan.scriptIds,
      buildId: BUILD_ID,
    };
  } catch (caught) {
    const err = caught as CaughtError;
    Logger.error("Injection.Failed", {
      path: "src/background/injection/injector.ts",
      missing: "successful injection pipeline completion",
      Reason: "InjectionStageFailed",
      ReasonDetail: err?.message ?? `Stage ${stage} failed without a message`,
      tabId: request.tabId,
      url: request.url,
      triggerSource: request.triggerSource,
      stage,
      buildId: BUILD_ID,
      SelectorAttempts: [],
      VariableContext: [],
    });

    return {
      ok: false,
      tabId: request.tabId,
      stage,
      reason: "InjectionStageFailed",
      reasonDetail: err?.message ?? `Stage ${stage} failed without a message`,
      buildId: BUILD_ID,
    };
  }
}

async function executeFile(
  tabId: number,
  file: string,
  world: chrome.scripting.ExecutionWorld,
): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: [file],
    world,
  });
}
```

## Stage 1 — dependency resolution

Dependency resolution produces a deterministic, ordered plan. It may read the
extension's bundled manifest, SQLite metadata, IndexedDB cache, or
`chrome.storage.local`, but it must not inject anything.

```ts
// src/background/injection/script-resolver.ts
export interface InjectionPlan {
  scriptIds: string[];
  mainWorldFiles: string[];
  cspFallbackFiles: string[];
}

export async function resolveInjectionPlan(url: string): Promise<InjectionPlan> {
  const matchedProject = await matchProjectForUrl(url);
  const scripts = await loadScriptsForProject(matchedProject.projectId);

  return {
    scriptIds: scripts.map((script) => script.id),
    mainWorldFiles: scripts.map((script) => script.bundlePath),
    cspFallbackFiles: scripts
      .filter((script) => script.requiresCspFallback)
      .map((script) => script.bundlePath),
  };
}
```

Rules:

- Preserve declared dependency order. Never sort by display name.
- Reject duplicate script ids before injection.
- Reject missing bundle paths with `Reason="MissingBundlePath"` and the exact
  path that was expected.
- Do not read or rewrite `StoredProject` keys in `chrome.storage.local`.

## Stage 2 — namespace bootstrapping

The namespace bootstrap is a tiny MAIN-world IIFE that creates the shared global
once and records build metadata. Later scripts must refer to
`RiseupAsiaMacroExt` directly after bootstrap.

```ts
// src/content/bootstrap-namespace.iife.ts
(() => {
  globalThis.RiseupAsiaMacroExt ??= {
    BuildId: "__BUILD_ID__",
    Logger: null,
    Runtime: null,
    require: null,
  };
})();
```

Rules:

- The bootstrap must be side-effect light: create namespace, attach build id,
  exit.
- It must not query the DOM, start timers, open databases, or install listeners.
- If the namespace already exists with the same build id, the stage is a no-op.
- If the namespace exists with a different build id, step 10 re-inject handling
  decides whether to uninject first.

## Stage 3 — relay installation

The relay bridges extension messages and page MAIN-world runtime events. It is
installed in the isolated world so it can use Chrome extension APIs safely while
keeping the page-facing SDK in MAIN world.

```ts
// src/content/isolated-relay.ts
const RELAY_EVENT = "riseupasia:macro-ext:relay";

chrome.runtime.onMessage.addListener((message) => {
  window.dispatchEvent(new CustomEvent(RELAY_EVENT, { detail: message }));
});

window.addEventListener(RELAY_EVENT, (event) => {
  const customEvent = event as CustomEvent;
  const detail = customEvent.detail as RelayEnvelope;
  if (detail?.direction !== "page-to-extension") {
    return;
  }

  void chrome.runtime.sendMessage(detail.message);
});
```

Rules:

- Install the relay before runtime IIFEs execute.
- Relay messages must be typed envelopes, never raw unvalidated objects.
- Listener teardown is mandatory on uninject and on page lifecycle teardown.
- Relay failure is a pipeline failure; do not continue to MAIN-world runtime
  execution without a working relay when the selected scripts require it.

## Stage 4 — IIFE execution

Every runtime script is bundled as a self-contained IIFE and injected into MAIN
world in dependency order. The IIFE must not leak local variables into the page.

Rules:

- No top-level imports at runtime; build output must be a browser-safe IIFE.
- No direct `console.log`/`log()` for errors. Use
  `RiseupAsiaMacroExt.Logger.error()` after the namespace logger is available.
- The IIFE must report its own script id and version into the runtime registry.
- If one IIFE fails, stop immediately and log the failing file path.

## Stage 5 — script-to-script communication setup

After all IIFEs load, the runtime links shared services: logger, dynamic loader,
message relay, storage handles, and event bus. This is the first point where
scripts may call each other through `RiseupAsiaMacroExt.require()`.

Rules:

- `RiseupAsiaMacroExt.require()` must fail with a typed `MissingModule` result,
  not throw an unhandled exception.
- Circular dependencies must be rejected during dependency resolution, before
  any runtime code executes.
- Runtime linking must emit a heartbeat consumed by the Status & Health panel
  from step 07.

## Stage 6 — CSP fallback handling

CSP fallback is an explicit exception path for sites that block normal runtime
execution. It is not a second general injection method.

Rules:

- Try CSP fallback only for scripts marked `requiresCspFallback` in the plan.
- Do not retry a failed normal injection through fallback unless the error code
  is a recognized CSP failure.
- A fallback attempt still counts as the same injection request and must be
  represented in the final result.
- If fallback fails, return one `InjectionStageFailed` result; do not recurse.

## Stage 7 — dynamic loading at runtime

Dynamic loading happens after the page runtime is ready. It supports lazy script
modules through `RiseupAsiaMacroExt.require()` without re-running the full
injection pipeline.

Rules:

- Dynamic modules must be registered in the dependency manifest.
- Missing modules log `Reason="MissingDynamicModule"` with the module id and
  expected bundle path.
- Dynamic loading must never mutate the original `InjectionPlan` for the tab.
- A dynamic module failure affects that module only; it does not trigger a full
  extension reload or automatic re-injection.

## Message contract

```ts
// src/shared/messages.ts
export const MSG_INJECT_TAB = "injection/inject-tab" as const;
export const EVT_INJECTION_STATE_CHANGED = "injection/state-changed" as const;

export interface InjectTabMessage {
  kind: typeof MSG_INJECT_TAB;
  tabId: number;
  url: string;
  triggerSource: "auto" | "popup" | "status-panel" | "keyboard-shortcut";
  force?: boolean;
}
```

The background listener must call only `injectIntoTab()` and return its typed
`InjectionResult` to the sender. Popup and Status panel UI must render the
result; they must not duplicate injection logic.

## Pitfalls

- **Injecting from the popup** — the popup can close mid-call and bypasses the
  one true pipeline. Send `MSG_INJECT_TAB` to the service worker instead.
- **Skipping the isolated relay** because a script "usually" does not need it —
  later features then fail without a message path. Install it deterministically.
- **Running on `chrome://newtab/`** — this is a guarded no-op, not a failed
  injection. Use `isNewTabOrBlankUrl()` and return `Reason="NewTabOrBlankUrl"`.
- **Using DOM script tags as the primary path** — this loses MV3 control and
  produces CSP-specific bugs. `chrome.scripting.executeScript()` is primary.
- **Continuing after a failed stage** — half-injected state is worse than a
  visible failure. Stop, log Code Red, and surface the failure.
- **Assuming the SDK exists in the service worker** — it does not. The SDK is
  page MAIN-world only.

## Acceptance

- [ ] All injection requests route through `injectIntoTab()` in the background
      service worker.
- [ ] The new-tab/blank guard runs before matcher, resolver, storage reads, and
      `chrome.scripting.executeScript()`.
- [ ] The seven stages execute in the documented order.
- [ ] Runtime scripts are injected into MAIN world; relay script is injected
      into ISOLATED world.
- [ ] A failed stage stops the pipeline and returns a typed `InjectionFailure`.
- [ ] Every failure log includes path, missing item, `Reason`, `ReasonDetail`,
      stage, tab id, build id, `SelectorAttempts`, and `VariableContext`.
- [ ] Dynamic runtime loading uses `RiseupAsiaMacroExt.require()` and does not
      re-run the full injection pipeline.

## Tests to ship with this step

- Unit: `injector.test.ts` — asserts stage order, fail-fast behavior, and no
  direct retry after a thrown `chrome.scripting.executeScript()` call.
- Unit: `injector-new-tab-guard.test.ts` — asserts guarded URLs return before
  resolver/storage/scripting mocks are touched.
- Unit: `script-resolver.test.ts` — asserts dependency order, duplicate id
  rejection, and missing bundle path diagnostics.
- Unit: `isolated-relay.test.ts` — asserts typed envelope filtering and teardown
  behavior.
- Manual Chrome E2E: inject into a normal HTTPS tab, verify
  `RiseupAsiaMacroExt` exists in the page DevTools console and is absent from
  popup/options/service-worker contexts.