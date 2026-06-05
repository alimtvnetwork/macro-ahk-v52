# 08 — Script Injection Lifecycle

## Why this step exists

Script injection is the highest-risk path in an MV3 extension: it crosses the
service worker, Chrome permission gates, tab lifecycle, page worlds, content
security policy, and app runtime. If every feature injects scripts its own
way, bugs become non-reproducible: duplicate panels, half-loaded namespaces,
missing relays, swallowed errors, and page-specific breakage. This step
defines one injection pipeline that all popup buttons, auto-injection,
reload flows, and re-injection controls must use.

## Contract

1. **Single entry point.** Every manual or automatic injection request MUST
   go through `injectIntoTab()` in the background service worker. No popup,
   options, or content script may call `chrome.scripting.executeScript()`
   directly.
2. **MV3 primitive only.** Injection uses `chrome.scripting.executeScript()`
   from the background SW. DOM `<script>` tag injection is forbidden unless
   the CSP fallback stage (§Stage 6) explicitly authorizes it for a single
   file.
3. **Built `.js` artifacts only.** Every entry in `files[]` MUST be a path
   to a Vite-emitted `.js` artifact under `assets/...`. Source `.ts` paths
   are rejected by Chrome and forbidden here (`mem://architecture/build-artifact-preservation`).
4. **Web-accessible.** Every injected file MUST appear in the manifest's
   `web_accessible_resources[].resources` (step 02). The injector validates
   this at boot and refuses to inject files not listed.
5. **MAIN-world SDK.** Runtime scripts that need the page's JS context are
   injected into `world: "MAIN"`. The `RiseupAsiaMacroExt` SDK exists only
   in target-page MAIN world (`mem://architecture/injection-context-awareness`).
6. **ISOLATED-world relay.** If extension-to-page messaging is needed, the
   relay content script is installed in the isolated world before
   MAIN-world runtime scripts execute.
7. **New-tab guard first.** `isNewTabOrBlankUrl()` is checked before URL
   matching, dependency resolution, storage reads, or any `chrome.scripting`
   call (`mem://features/new-tab-no-url-guard`).
8. **Seven ordered stages.** Fixed order, must not be skipped — see §Lifecycle.
9. **Fail-fast, no retry.** A failed stage stops the pipeline immediately,
   writes one Code Red row, and returns a typed failure result
   (`mem://constraints/no-retry-policy`).
10. **Sentinel-delegated idempotency.** Step 09 owns the sentinel; this
    step calls it. `force` re-injection MUST first call step 10's
    `uninjectFromTab()` when a prior namespace exists.
11. **Mandatory Code-Red shape.** Every failure log carries `Path`,
    `Missing`, `Reason`, `ReasonDetail`, `Stage`, `TabId`, `Url`, `BuildId`,
    `SelectorAttempts: null` (with implicit reason "n/a — not selector
    flow"), `VariableContext: null` (with implicit reason "n/a — not
    variable flow"). Explicit `unknown` outside `toCaughtError()` is
    forbidden (`mem://standards/unknown-usage-policy`).

## Canonical failure-reason table (normative)

| Reason | Meaning | Carries |
|---|---|---|
| `NewTabOrBlankUrl` | Guarded URL — normal no-op | `url` |
| `NotWebAccessible` | Bundle path not in `web_accessible_resources` | `path` |
| `MissingBundlePath` | Resolver could not find a planned `.js` file | `path` |
| `MissingDynamicModule` | `RiseupAsiaMacroExt.require(id)` for unregistered id | `moduleId`, expected `path` |
| `BootstrapFailed` | Stage 2 threw | `Stage="bootstrapping-namespace"` |
| `RelayInstallFailed` | Stage 3 threw | `Stage="installing-relay"` |
| `IifeFailed` | Stage 4 threw | `Stage="executing-iife"`, failing `file` |
| `LinkRuntimeFailed` | Stage 5 messaging failed | `Stage="linking-runtime"` |
| `CspBlocked` | Stage 6 detected CSP violation | `cspDirective` if known |
| `BuildIdMismatch` | Prior namespace from a different build | `priorBuildId`, `currentBuildId` |
| `NoPermissionForTab` | Chrome refused the executeScript on this URL | raw Chrome message in `ReasonDetail` |
| `TabClosedDuringInjection` | Tab id no longer exists mid-pipeline | `tabId` |
| `InjectionStageFailed` | Catch-all (last resort) | `ReasonDetail` carries raw message |

### Chrome error message → Reason mapping (mandatory)

The injector MUST classify thrown `chrome.scripting.executeScript` errors
via substring match before falling back to `InjectionStageFailed`:

| Substring in `err.message` | Reason |
|---|---|
| `Cannot access contents of url "chrome://"` | `NoPermissionForTab` |
| `Cannot access a chrome:// URL` | `NoPermissionForTab` |
| `Cannot access contents of url "chrome-extension://"` | `NoPermissionForTab` |
| `The tab was closed.` | `TabClosedDuringInjection` |
| `No tab with id` | `TabClosedDuringInjection` |
| `Refused to execute inline script` | `CspBlocked` |
| `Content Security Policy` | `CspBlocked` |
| `Extension context invalidated` | `ContextInvalidated` (relay must self-teardown — §Relay teardown) |

Raw message is always preserved in `ReasonDetail`.

## Lifecycle states and types

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
  reason: string;             // from the table above
  reasonDetail: string;
  buildId: string;
}
export type InjectionResult = InjectionSuccess | InjectionFailure;
```

## Stage 0 — guard and sentinel check

```ts
// src/background/injection/injector.ts
import { BUILD_ID } from "@shared/constants";
import { isNewTabOrBlankUrl } from "@shared/url-utils";
import { isAlreadyInjected } from "./sentinel";            // step 09
import { uninjectFromTab } from "./uninject";              // step 10
import { resolveInjectionPlan } from "./script-resolver";
import { classifyExecError, writeInjectionCodeRed } from "./diagnostics";
import { toCaughtError } from "@shared/errors";

export async function injectIntoTab(request: InjectionRequest): Promise<InjectionResult> {
  let stage: InjectionStage = "idle";
  try {
    if (isNewTabOrBlankUrl(request.url)) {
      return fail(request, "guarded", "NewTabOrBlankUrl", `Skipped url=${request.url}`);
    }

    const sentinel = await isAlreadyInjected(request.tabId);   // boolean | "build-mismatch"
    if (sentinel === true && !request.force) {
      return { ok: true, tabId: request.tabId, stage: "ready", injectedScriptIds: [], buildId: BUILD_ID };
    }
    if (sentinel === "build-mismatch" || (sentinel === true && request.force)) {
      // Force OR prior namespace from a different build → uninject first.
      await uninjectFromTab(request.tabId);
    }

    stage = "resolving-dependencies";
    const plan = await resolveInjectionPlan(request.url);     // includes bootstrap+relay+iifes+csp

    stage = "bootstrapping-namespace";
    await executeFile(request.tabId, plan.bootstrapFile, "MAIN");

    stage = "installing-relay";
    await executeFile(request.tabId, plan.relayFile, "ISOLATED");

    stage = "executing-iife";
    for (const file of plan.mainWorldFiles) {
      await executeFile(request.tabId, file, "MAIN");
    }

    stage = "linking-runtime";
    await chrome.tabs.sendMessage(request.tabId, {
      kind: "injection/link-runtime", buildId: BUILD_ID,
    });

    stage = "handling-csp-fallback";
    await runCspFallbackIfRequired(request.tabId, plan.cspFallbackFiles);

    stage = "ready";
    return {
      ok: true, tabId: request.tabId, stage,
      injectedScriptIds: plan.scriptIds, buildId: BUILD_ID,
    };
  } catch (caught) {
    const err = toCaughtError(caught);
    const reason = classifyExecError(err.message, stage);     // table above
    await writeInjectionCodeRed({
      Path: "src/background/injection/injector.ts",
      Missing: "successful injection pipeline completion",
      Reason: reason,
      ReasonDetail: err.message ?? `Stage ${stage} failed without a message`,
      Stage: stage, TabId: request.tabId, Url: request.url,
      TriggerSource: request.triggerSource, BuildId: BUILD_ID,
      SelectorAttempts: null, VariableContext: null,
    });
    return {
      ok: false, tabId: request.tabId, stage,
      reason, reasonDetail: err.message ?? `Stage ${stage} failed without a message`,
      buildId: BUILD_ID,
    };
  }
}

async function executeFile(
  tabId: number, file: string, world: chrome.scripting.ExecutionWorld,
): Promise<void> {
  if (!file.endsWith(".js")) {
    throw new Error(`NotJsArtifact: ${file}`);
  }
  await chrome.scripting.executeScript({ target: { tabId }, files: [file], world });
}
```

## Stage 1 — dependency resolution

Resolution produces a deterministic, ordered plan from the build manifest
emitted at `assets/instruction.json`
(`mem://architecture/instruction-driven-seeding`,
`mem://architecture/instruction-dual-emit-phase-2b`).

```ts
// src/background/injection/script-resolver.ts
export interface InjectionPlan {
  scriptIds: string[];
  bootstrapFile: string;            // e.g. "assets/content/bootstrap-namespace-<hash>.iife.js"
  relayFile: string;                // e.g. "assets/content/isolated-relay-<hash>.iife.js"
  mainWorldFiles: string[];         // emitted .js paths, in dependency order
  cspFallbackFiles: string[];
}

export async function resolveInjectionPlan(url: string): Promise<InjectionPlan> {
  const manifest = await loadBuildManifest();                // assets/instruction.json
  const project  = await matchProjectForUrl(url);            // READS StoredProject; never rewrites
  const scripts  = await loadScriptsForProject(project.projectId);

  const plan: InjectionPlan = {
    scriptIds:        scripts.map((s) => s.id),
    bootstrapFile:    manifest.entries.bootstrap,
    relayFile:        manifest.entries.relay,
    mainWorldFiles:   scripts.map((s) => s.bundlePath),
    cspFallbackFiles: scripts.filter((s) => s.requiresCspFallback).map((s) => s.bundlePath),
  };

  for (const file of [plan.bootstrapFile, plan.relayFile, ...plan.mainWorldFiles, ...plan.cspFallbackFiles]) {
    if (!isWebAccessible(file))  { throw new Error(`NotWebAccessible: ${file}`); }
    if (!file.endsWith(".js"))   { throw new Error(`NotJsArtifact: ${file}`); }
  }
  rejectDuplicateScriptIds(plan.scriptIds);
  return plan;
}
```

Rules:

- Preserve declared dependency order; never sort by display name.
- Reject duplicate script ids → `MissingBundlePath`/`DuplicateScriptId`.
- `StoredProject` keys are read-only — no normalize, no PascalCase rewrite
  (`mem://constraints/no-storage-pascalcase-migration`).

## Stage 2 — namespace bootstrapping

```ts
// src/content/bootstrap-namespace.iife.ts → compiled to .iife.js
(() => {
  const ns = (globalThis as { RiseupAsiaMacroExt?: { BuildId: string } }).RiseupAsiaMacroExt;
  if (ns?.BuildId === "__BUILD_ID__") { return; }            // same build: no-op
  (globalThis as { RiseupAsiaMacroExt?: unknown }).RiseupAsiaMacroExt = {
    BuildId: "__BUILD_ID__", Logger: null, Runtime: null, require: null,
  };
})();
```

Rules: side-effect light — no DOM queries, timers, DBs, or listeners. If
namespace exists with a different `BuildId`, Stage 0's `"build-mismatch"`
branch has already called `uninjectFromTab()`; this stage assumes a clean
slate.

## Stage 3 — relay installation (ISOLATED world)

Two worlds share the DOM and `window` event dispatch, but `CustomEvent.detail`
is **structured-cloned** across worlds (functions, prototypes, and class
identity are lost). The envelope MUST be JSON-safe.

```ts
// src/content/isolated-relay.ts → .iife.js
import { type BridgeEnvelope, isBridgeEnvelope } from "@shared/relay";

const RELAY_EVENT = "riseupasia:macro-ext:relay";

// Self-teardown when the extension context dies.
function isContextAlive(): boolean {
  try { return Boolean(chrome.runtime?.id); } catch { return false; }
}

const onExtMessage = (msg: unknown) => {
  if (!isContextAlive()) { teardown(); return; }
  const env: BridgeEnvelope = { source: "extension", kind: "ext-to-page", buildId: msg?.["buildId"] ?? "", payload: msg };
  window.dispatchEvent(new CustomEvent(RELAY_EVENT, { detail: env }));
};
const onPageEvent = (event: Event) => {
  const env = (event as CustomEvent).detail as unknown;
  if (!isBridgeEnvelope(env) || env.source !== "page") { return; }
  if (!isContextAlive()) { teardown(); return; }
  try { void chrome.runtime.sendMessage(env.payload); }
  catch { teardown(); }
};
function teardown() {
  try { chrome.runtime.onMessage.removeListener(onExtMessage); } catch { /* noop */ }
  window.removeEventListener(RELAY_EVENT, onPageEvent);
  window.removeEventListener("pagehide", teardown);
}

chrome.runtime.onMessage.addListener(onExtMessage);
window.addEventListener(RELAY_EVENT, onPageEvent);
window.addEventListener("pagehide", teardown, { once: true });
```

`BridgeEnvelope` is the canonical type from step 02:

```ts
export interface BridgeEnvelope {
  source: "page" | "isolated" | "extension";
  kind: string;
  buildId: string;
  payload: unknown;            // JSON-safe only — no functions, no class instances
}
export function isBridgeEnvelope(v: unknown): v is BridgeEnvelope { /* … */ }
```

### Relay teardown (mandatory)

If `chrome.runtime.id` becomes `undefined` (extension reloaded — step 06)
the relay MUST tear itself down rather than logging perpetually
(`mem://standards/timer-and-observer-teardown`).

## Stage 4 — IIFE execution

Stage 5 message receiver lives in the **isolated relay**, which
re-broadcasts to MAIN world via `CustomEvent(RELAY_EVENT)`. MAIN-world
IIFEs subscribe via `window.addEventListener(RELAY_EVENT, …)` filtered by
`source === "extension"`. `chrome.tabs.sendMessage` reaches the isolated
relay only; it never reaches MAIN directly.

Rules:

- Build output is a browser-safe IIFE; no top-level imports at runtime.
- No `console.log`/bare `log()` for errors. Use
  `RiseupAsiaMacroExt.Logger.error()` (`mem://standards/error-logging-via-namespace-logger.md`).
- Each IIFE registers `{ scriptId, version }` into the runtime registry.
- One IIFE failing stops the loop; log Code Red carries the failing `file`
  and `Reason="IifeFailed"`.

## Stage 5 — script-to-script communication

```ts
// MAIN-world consumer
window.addEventListener("riseupasia:macro-ext:relay", (ev) => {
  const env = (ev as CustomEvent).detail;
  if (env?.source !== "extension") { return; }
  // dispatch env.payload through RiseupAsiaMacroExt.Runtime
});
```

Rules:

- `RiseupAsiaMacroExt.require()` returns a typed `MissingModule` failure;
  never throws.
- Circular deps rejected in Stage 1 (before any runtime code executes).
- Linking emits a heartbeat consumed by step 07.

## Stage 6 — CSP fallback

Try only for scripts marked `requiresCspFallback`, and only when the
previous failure mapped to `CspBlocked`. No general second attempt; one
fallback per request; failure → single `CspBlocked` result.

## Stage 7 — dynamic loading

`RiseupAsiaMacroExt.require(id)` per `mem://architecture/dynamic-script-loading`.
Missing → `Reason="MissingDynamicModule"` with `moduleId` and expected
bundle path. Never mutates the original `InjectionPlan`; failure is local
to that module (no extension reload, no re-injection).

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

The background listener calls only `injectIntoTab()` and returns its typed
`InjectionResult` to the sender. Popup and Status panel UI must render the
result; they must not duplicate injection logic.

## Pitfalls

- **Injecting from the popup** — popup can close mid-call; bypasses the
  one true pipeline.
- **Source `.ts` in `files[]`** — Chrome rejects non-`.js`. Only emitted
  bundle paths are valid.
- **Bundle path missing from `web_accessible_resources`** — silent
  injection failures. The resolver validates at boot.
- **Skipping the isolated relay** because a script "usually" doesn't need
  it → later features fail with no message path.
- **Running on `chrome://newtab/`** — guarded no-op, not a failure.
- **DOM script tags as primary path** — loses MV3 control, produces
  CSP-specific bugs.
- **Continuing after a failed stage** — half-injected state is worse than
  a visible failure.
- **Assuming the SDK exists in the SW** — it does not. SDK is page MAIN
  world only.
- **Calling `force: true` without uninject** — leaves a stale namespace
  from a different build under a new build's IIFEs. Stage 0 handles this.
- **Rewriting `StoredProject` keys** — banned by
  `mem://constraints/no-storage-pascalcase-migration`. Resolver reads only.
- **Relay logging forever after extension reload** — relay MUST self-tear
  down when `chrome.runtime.id` is undefined.
- **Treating `CustomEvent.detail` as a shared reference across worlds** —
  it is structured-cloned; functions and class identity are lost. Use
  JSON-safe `BridgeEnvelope`.

## Acceptance

- [ ] All injection requests route through `injectIntoTab()` in the
      background SW.
- [ ] New-tab/blank guard runs before matcher, resolver, storage reads,
      and `chrome.scripting.executeScript()`.
- [ ] All `files[]` entries are `.js` artifacts listed in
      `web_accessible_resources`; resolver rejects others with
      `NotWebAccessible` / `NotJsArtifact` before any `executeScript` call.
- [ ] The seven stages execute in documented order; relay installs before
      runtime IIFEs.
- [ ] Runtime scripts inject into MAIN; relay into ISOLATED.
- [ ] A failed stage stops the pipeline and returns a typed
      `InjectionFailure`; thrown Chrome errors map to the canonical Reason
      table; raw message preserved in `ReasonDetail`.
- [ ] Every failure log includes the mandatory fields (path, missing,
      Reason, ReasonDetail, Stage, TabId, Url, BuildId,
      `SelectorAttempts:null`, `VariableContext:null`).
- [ ] `force: true` with a prior namespace calls `uninjectFromTab()` first.
- [ ] `"build-mismatch"` from the sentinel triggers uninject before
      bootstrap.
- [ ] Calling `injectIntoTab` twice with `force:false` results in exactly
      one set of `chrome.scripting.executeScript` calls (assert via spy).
- [ ] Relay self-tears-down on `Extension context invalidated`.
- [ ] Dynamic runtime loading uses `RiseupAsiaMacroExt.require()` and does
      not re-run the full pipeline.

## Tests to ship with this step

- Unit `injector.test.ts` — asserts stage order, fail-fast, no retry after
  a thrown `executeScript`, and idempotency (two `force:false` calls →
  one set of `executeScript` calls).
- Unit `injector-new-tab-guard.test.ts` — guarded URLs return before
  resolver/storage/scripting mocks are touched.
- Unit `injector-force-uninject.test.ts` — `force:true` with a prior
  namespace calls `uninjectFromTab()` before any new `executeScript`.
- Unit `script-resolver.test.ts` — dependency order, duplicate id
  rejection, `NotWebAccessible` and `NotJsArtifact` diagnostics, no
  `StoredProject` write attempts.
- Unit `classify-exec-error.test.ts` — every row of the Chrome → Reason
  table maps correctly; default is `InjectionStageFailed`.
- Unit `isolated-relay.test.ts` — typed envelope filtering, structured-
  clone safety, self-teardown when `chrome.runtime.id` is undefined,
  listener teardown on `pagehide`.
- Manual Chrome E2E: inject into a normal HTTPS tab, verify
  `RiseupAsiaMacroExt` exists in the page DevTools console and is absent
  from popup/options/service-worker contexts; reload the extension and
  observe relay teardown (no log spam).

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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](readme.md) for sibling specs and cross-references.
