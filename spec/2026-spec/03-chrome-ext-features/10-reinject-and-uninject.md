# 10 — Re-inject and Uninject

## Why this step exists

Step 08 defines how to inject and step 09 prevents duplicate injection. The
remaining failure mode is stale or broken injected state: an old build
marker is present, a relay listener is duplicated, a floating panel is
stuck, or a runtime module failed after partial setup. The fix is not to
overwrite the sentinel and inject again. The fix is an explicit, observable
teardown path, followed by a fresh injection only when teardown succeeds.

This step defines the two recovery actions exposed by the popup Status
panel: `Uninject` and `Re-inject`.

## Contract

1. **Single background entry points.** UI sends messages to the SW;
   popup/options/content must not perform teardown or force injection
   directly.
2. **Uninject is teardown-first.** Remove listeners, timers, observers,
   relay handlers, UI nodes, runtime registries, and CSS nodes **before**
   clearing the sentinel attributes from step 09.
3. **Re-inject is two-phase.** Always `uninjectFromTab()` first; only a
   successful uninject may call `injectIntoTab({ force: true })`.
4. **Stale build uses re-inject.** `"build-mismatch"` from step 09 is
   resolved only by the explicit re-inject flow. Normal injection must not
   overwrite a stale sentinel.
5. **No retry.** Each phase is attempted once. Failed uninject → no inject.
   Failed force-inject → no retry, no extension reload.
6. **New-tab guard first.** `isNewTabOrBlankUrl()` runs before teardown
   probes or any `chrome.scripting.executeScript()` call.
7. **Typed result only.** Both flows return typed `UninjectResult` /
   `ReinjectResult`; UI renders the result and must not infer success
   from a missing exception.
8. **Code Red on failure.** Every failed phase logs the full mandatory
   shape (§Failure log).
9. **Teardown-failure surfacing.** Per-callback teardown failures are NOT
   silently absorbed (see §Teardown failure escalation).
10. **`force:true` precondition.** The injector enforces a post-uninject
    sentinel check (§Force-inject precondition).
11. **Auto-injector never uses `force`.** Statically audited
    (§Audit script).
12. **Reload-during-uninject is terminal, not Code Red.** Catching
    `Extension context invalidated` (step 06 auto-reload) → map to
    `Reason="ExtensionContextInvalidated"` and stop. No retry, no Code Red.
13. **Verbose-gated detail.** `reasonDetail` is truncated to 240 chars
    unless per-project `VerboseLogging` is ON
    (`mem://standards/verbose-logging-and-failure-diagnostics`). Full
    stack lives in SQLite `error_events.detail_full`.

## Message contract

```ts
// src/shared/messages.ts
export const MSG_UNINJECT_TAB    = "injection/uninject-tab"    as const;
export const MSG_REINJECT_TAB    = "injection/reinject-tab"    as const;
export const EVT_BEFORE_UNINJECT = "injection/before-uninject" as const;
export const EVT_AFTER_UNINJECT  = "injection/after-uninject"  as const;
export const EVT_BEFORE_UNINJECT_ACK = "injection/before-uninject-ack" as const;

export interface UninjectTabMessage {
  kind: typeof MSG_UNINJECT_TAB;
  tabId: number;
  url: string;
  triggerSource: "popup" | "status-panel" | "keyboard-shortcut";
}
export interface ReinjectTabMessage {
  kind: typeof MSG_REINJECT_TAB;
  tabId: number;
  url: string;
  triggerSource: "popup" | "status-panel" | "keyboard-shortcut";
}
```

Keyboard shortcuts (if implemented) must ignore editable fields per the
recorder rule.

## Result contracts

```ts
// src/background/injection/teardown-types.ts
export type TeardownDomain = "runtime" | "relay" | "panel" | "styles";

export type TeardownStep =
  | "guarded"
  | "probe-sentinel"
  | "broadcast-before-uninject"
  | "runtime-teardown"
  | "panel-teardown"
  | "style-teardown"
  | "sentinel-clear"
  | "broadcast-after-uninject"
  | "relay-teardown"             // intentionally LAST — see §Step ordering
  | "done";

export type UninjectOutcome = "already-clean" | "cleaned";

export interface UninjectSuccess {
  ok: true;
  tabId: number;
  step: "done";
  outcome: UninjectOutcome;
  removedScriptIds: string[];
  buildId: string;
}
export interface UninjectFailure {
  ok: false;
  tabId: number;
  step: TeardownStep;
  reason: string;
  reasonDetail: string;
  buildId: string;
}
export type UninjectResult = UninjectSuccess | UninjectFailure;

export interface ReinjectResult {
  ok: boolean;
  tabId: number;
  uninject: UninjectResult;
  inject?: InjectionResult;
  reason?: string;
  reasonDetail?: string;
}

export interface TeardownExecResult {
  ran: string[];
  failed: { id: string; reason: string }[];
}
```

`outcome` lets the UI render "Nothing to uninject" vs "Removed N scripts"
without inferring from `removedScriptIds.length`.

## SDK surface (owned by step 08, restated here)

The teardown registry is part of the MAIN-world SDK
(`RiseupAsiaMacroExt.Runtime`) defined in step 08 Stage 5:

```ts
// Exposed on RiseupAsiaMacroExt.Runtime (step 08 owns the type)
registerTeardown(id: string, fn: () => void, domain?: TeardownDomain): void;
runTeardown(domain: TeardownDomain): { ran: string[]; failed: { id: string; reason: string }[] };
```

Every `setInterval`, `setTimeout`, `MutationObserver`, and event listener
created by injected code registers teardown at creation time
(`mem://standards/timer-and-observer-teardown`). Callbacks run in reverse
registration order; each must be idempotent and must not create new
timers/observers/listeners.

## `executeTeardown` contract

```ts
// src/background/injection/teardown.ts
import type { TeardownDomain, TeardownExecResult } from "./teardown-types";

export async function executeTeardown(
  tabId: number,
  domain: TeardownDomain,
): Promise<TeardownExecResult> {
  const [frame] = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    world: "MAIN",
    args: [domain],
    func: (d) => {
      const r = (globalThis as { RiseupAsiaMacroExt?: { Runtime?: { runTeardown?: (x: string) => unknown } } }).RiseupAsiaMacroExt;
      if (!r?.Runtime?.runTeardown) { return { ran: [], failed: [{ id: "runtime", reason: "RuntimeRegistryAbsent" }] }; }
      try { return r.Runtime.runTeardown(d); }
      catch (e) { return { ran: [], failed: [{ id: "runtime", reason: e instanceof Error ? e.message : "TeardownThrew" }] }; }
    },
  });
  return (frame?.result as TeardownExecResult) ?? { ran: [], failed: [{ id: "frame", reason: "NoFrameResult" }] };
}
```

## Step ordering (NORMATIVE — order changed vs prior draft)

```text
1. guarded check (new-tab/blank URL)
2. probe-sentinel
3. broadcast-before-uninject  (await ack, 500 ms cap, single-shot)
4. runtime-teardown
5. panel-teardown
6. style-teardown
7. sentinel-clear
8. broadcast-after-uninject   (still goes through relay; relay alive)
9. relay-teardown             (last — relay is needed by step 8)
10. done
```

Rationale: `EVT_AFTER_UNINJECT` is broadcast through the ISOLATED-world
relay; tearing down the relay before step 8 would silently drop the
event. Relay teardown is last.

### Broadcast ack rule (step 3)

`EVT_BEFORE_UNINJECT` is sent via `chrome.tabs.sendMessage` and awaits
`EVT_BEFORE_UNINJECT_ACK` up to **500 ms**, single-shot. On timeout, log a
`warn` diagnostic (`Reason="BroadcastAckTimeout"`) and proceed to
runtime-teardown. This is not Code Red — pages may legitimately not have
the relay yet (e.g. just-installed extension).

## Teardown failure escalation

Per-callback failures are reported via the returned `failed[]`. The
uninject orchestrator MUST escalate:

```ts
const r = await executeTeardown(tabId, "runtime");
if (r.failed.length > 0) {
  return failUninject({
    step: "runtime-teardown",
    reason: "TeardownCallbackFailed",
    reasonDetail: r.failed.map((f) => `${f.id}: ${f.reason}`).join("; "),
  });
}
```

Same escalation for `panel`, `styles`, and `relay`. A teardown with any
`failed[]` entry blocks `sentinel-clear` and the subsequent re-inject.

## Uninject implementation

```ts
// src/background/injection/uninjector.ts
import { BUILD_ID } from "@shared/constants";
import { Logger } from "@shared/logger";
import { isNewTabOrBlankUrl } from "@shared/url-utils";
import { clearInjectionSentinel, probeInjectionSentinel } from "./sentinel";
import { executeTeardown } from "./teardown";
import { sendTabMessageSafe } from "@platform/messaging";
import { toCaughtError } from "@shared/errors";
import {
  EVT_BEFORE_UNINJECT, EVT_AFTER_UNINJECT, MSG_UNINJECT_TAB,
} from "@shared/messages";
import type {
  UninjectResult, UninjectFailure, TeardownStep, TeardownDomain,
} from "./teardown-types";

const ACK_TIMEOUT_MS = 500;

export async function uninjectFromTab(request: UninjectTabMessage): Promise<UninjectResult> {
  let step: TeardownStep = "guarded";
  const fail = (overrides: Partial<UninjectFailure>): UninjectFailure => ({
    ok: false, tabId: request.tabId, step,
    reason: "UninjectStepFailed", reasonDetail: "",
    buildId: BUILD_ID, ...overrides,
  });

  try {
    if (isNewTabOrBlankUrl(request.url)) {
      return fail({ reason: "NewTabOrBlankUrl", reasonDetail: `Uninject skipped url=${request.url}` });
    }

    step = "probe-sentinel";
    const sentinel = await probeInjectionSentinel(request.tabId);
    if (!sentinel.injected) {
      return { ok: true, tabId: request.tabId, step: "done",
               outcome: "already-clean", removedScriptIds: [], buildId: BUILD_ID };
    }

    step = "broadcast-before-uninject";
    const ack = await sendTabMessageSafe(
      request.tabId,
      { kind: EVT_BEFORE_UNINJECT, buildId: BUILD_ID },
      { timeoutMs: ACK_TIMEOUT_MS },
    );
    if (!ack.ok && ack.reason !== "AckTimeout") {
      if (ack.reason === "ExtensionContextInvalidated") {
        return fail({ reason: "ExtensionContextInvalidated", reasonDetail: "SW reload mid-uninject" });
      }
      return fail({ reason: "BroadcastFailed", reasonDetail: ack.reason });
    }

    for (const d of ["runtime", "panel", "styles"] as TeardownDomain[]) {
      step = `${d}-teardown` as TeardownStep;
      const r = await executeTeardown(request.tabId, d);
      if (r.failed.length > 0) {
        return fail({
          reason: "TeardownCallbackFailed",
          reasonDetail: r.failed.map((f) => `${f.id}: ${f.reason}`).join("; "),
        });
      }
    }

    step = "sentinel-clear";
    await clearInjectionSentinel(request.tabId);

    step = "broadcast-after-uninject";
    // Direct MAIN-world dispatch — does NOT depend on relay (relay still up here).
    await chrome.scripting.executeScript({
      target: { tabId: request.tabId, frameIds: [0] },
      world: "MAIN",
      args: [EVT_AFTER_UNINJECT, BUILD_ID],
      func: (kind, buildId) => {
        window.dispatchEvent(new CustomEvent("riseupasia:macro-ext:relay", {
          detail: { source: "extension", kind, buildId, payload: { kind, buildId } },
        }));
      },
    });

    step = "relay-teardown";
    const relay = await executeTeardown(request.tabId, "relay");
    if (relay.failed.length > 0) {
      return fail({
        reason: "TeardownCallbackFailed",
        reasonDetail: relay.failed.map((f) => `${f.id}: ${f.reason}`).join("; "),
      });
    }

    return { ok: true, tabId: request.tabId, step: "done",
             outcome: "cleaned", removedScriptIds: sentinel.scriptIds, buildId: BUILD_ID };
  } catch (caught) {
    const err = toCaughtError(caught);
    if ((err.message ?? "").includes("Extension context invalidated")) {
      return fail({ reason: "ExtensionContextInvalidated", reasonDetail: err.message ?? "" });
    }
    const truncated = truncateForLog(err.message ?? `Uninject failed at step=${step}`);
    Logger.error("Injection.UninjectFailed", {
      Path: "src/background/injection/uninjector.ts",
      Missing: "complete injected runtime teardown",
      Reason: "UninjectStepFailed",
      ReasonDetail: truncated,                     // 240-char trunc; full in detail_full
      TabId: request.tabId, Url: request.url,
      TriggerSource: request.triggerSource,
      Step: step, BuildId: BUILD_ID,
      SelectorAttempts: null, VariableContext: null,
    });
    return fail({ reasonDetail: truncated });
  }
}
```

`truncateForLog()` honors the per-project `VerboseLogging` toggle; when
ON it returns the full string and stores it in
`error_events.detail_full` separately.

## Sentinel clearing helper

Lives in `src/background/injection/sentinel.ts` — **file** is shared with
step 09; **behavioral ownership of when to clear** is step 10.

```ts
export async function clearInjectionSentinel(tabId: number): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    world: "MAIN",
    args: [ATTR_INJECTED, ATTR_BUILD_ID, ATTR_INSTALLED_AT, ATTR_SCRIPT_IDS, ATTR_SCRIPT_HASH],
    func: (iA, bA, tA, sA, hA) => {
      const root = document.documentElement;
      root.removeAttribute(iA); root.removeAttribute(bA);
      root.removeAttribute(tA); root.removeAttribute(sA); root.removeAttribute(hA);
    },
  });
}
```

Clearing failure → uninject result is failed; do not hide.

## Re-inject implementation

```ts
// src/background/injection/reinjector.ts
import { injectIntoTab } from "./injector";
import { uninjectFromTab } from "./uninjector";
import type { ReinjectResult } from "./teardown-types";
import { MSG_UNINJECT_TAB } from "@shared/messages";

export async function reinjectIntoTab(request: ReinjectTabMessage): Promise<ReinjectResult> {
  const uninject = await uninjectFromTab({
    kind: MSG_UNINJECT_TAB,
    tabId: request.tabId, url: request.url,
    triggerSource: request.triggerSource,
  });
  if (!uninject.ok) {
    return {
      ok: false, tabId: request.tabId, uninject,
      reason: "UninjectBeforeReinjectFailed", reasonDetail: uninject.reasonDetail,
    };
  }
  const inject = await injectIntoTab({
    tabId: request.tabId, url: request.url,
    triggerSource: request.triggerSource,
    force: true,                                   // see §Force-inject precondition
  });
  return {
    ok: inject.ok, tabId: request.tabId, uninject, inject,
    reason:       inject.ok ? undefined : "ForceInjectFailed",
    reasonDetail: inject.ok ? undefined : (inject as InjectionFailure).reasonDetail,
  };
}
```

### Force-inject precondition (asserted in step 08 injector)

When `force === true`, the injector MUST re-probe the sentinel after
acquiring the per-tab mutex and assert it is **absent** (i.e. uninject
postcondition held). If the sentinel is still present, return
`Reason="ForceInjectPreconditionFailed"` and do NOT call `executeScript`.

## UI behavior (step 07 cross-link)

| Sentinel state | Available buttons |
|---|---|
| Missing | `Inject` |
| Present (matching build) | `Re-inject`, `Uninject` |
| Present (stale build = `"build-mismatch"`) | `Re-inject` only |

Pressing `Inject` while stale returns `Reason="UseReinjectForStaleBuild"`
(user-error class, not Code Red). Buttons:

- Disable while message in flight.
- Show typed `reasonDetail` on failure (truncated unless verbose ON).
- Never render a blank panel during transition.
- Never call `window.location.reload()` as part of re-inject/uninject.

## What uninject removes

- floating panels and their shadow roots
- extension-owned style tags and CSS sentinels
- keyboard shortcut listeners
- message relay listeners and correlation maps
- mutation observers
- intervals, timeouts, animation frames, idle callbacks
- runtime registries and dynamic module handles
- page heartbeat timers
- step 09 sentinel attributes

Injected JS cannot be unloaded from the engine; "uninject" means all
extension-owned behavior is disabled and all DOM markers are removed, not
that memory rewinds.

## Audit script (force callers)

```text
scripts/audit-force-inject-callers.mjs
  Scans: src/**/*.{ts,tsx}
  Finds: literal `force: true` (and `force:true`) in object literals
  Allowed callsites (allowlist):
    - src/background/injection/reinjector.ts
    - src/popup/components/StatusPanel.tsx
    - src/options/components/DebugPanel.tsx
  Fails CI on any other callsite (e.g. auto-injector, content scripts).
```

Reuses the no-retry-policy enforcement pattern
(`mem://constraints/no-retry-policy`).

## Pitfalls

- **Clearing sentinel first** — Status reads `not-injected` while old
  listeners still run. Clear sentinel **after** runtime/panel/styles
  teardown.
- **Tearing down the relay before `EVT_AFTER_UNINJECT`** — message lost.
  Relay teardown is step 9 (last).
- **Re-injecting after failed uninject** — creates the duplicate panel
  problem. Stop after failed uninject.
- **`chrome.tabs.reload()` as cleanup** — changes user state; not an
  uninject.
- **Silently absorbing `failed[]`** — orchestrator must escalate.
- **`force` from auto-injector** — auto paths must be conservative;
  audited.
- **Leaving relay listeners installed** — duplicate relays cause
  duplicate DB/token requests.
- **`Extension context invalidated` mid-uninject** — terminal, not Code
  Red; expected during step 06 auto-reload.
- **Double-uninject** — second call must succeed with
  `outcome:"already-clean"`.

## Acceptance

- [ ] `Uninject` removes runtime behavior before clearing sentinel
      attributes; relay teardown is last.
- [ ] `EVT_BEFORE_UNINJECT` waits up to 500 ms for ack, then proceeds.
- [ ] `EVT_AFTER_UNINJECT` is dispatched via direct MAIN-world
      `executeScript`, not via `chrome.tabs.sendMessage`.
- [ ] Per-callback teardown failures escalate to `ok:false` with
      `Reason="TeardownCallbackFailed"` and enumerated ids in
      `reasonDetail`.
- [ ] `Re-inject` runs uninject first; force-inject only after success.
- [ ] Force-inject re-probes sentinel post-uninject; mismatched
      postcondition returns `ForceInjectPreconditionFailed`.
- [ ] Stale build resolved only by explicit re-inject. `Inject` on stale →
      `UseReinjectForStaleBuild`.
- [ ] New-tab/blank URLs return guarded before teardown probes.
- [ ] Every failed teardown logs Code Red with `Path`, `Missing`,
      `Reason`, `ReasonDetail`, `TabId`, `Url`, `BuildId`, `Step`,
      `SelectorAttempts:null`, `VariableContext:null`.
- [ ] `reasonDetail` is ≤240 chars unless `VerboseLogging` is ON; full
      stack persists to `error_events.detail_full`.
- [ ] `Extension context invalidated` mid-uninject → terminal, no Code
      Red, no retry.
- [ ] `scripts/audit-force-inject-callers.mjs` passes — `force:true`
      appears only in the allowlist.
- [ ] Status panel buttons reflect current sentinel state; never blank
      during transition.

## Tests to ship with this step

- Unit `uninjector.test.ts` — asserts step ordering (runtime → panel →
  styles → sentinel-clear → after-uninject → relay), `outcome:"cleaned"`.
- Unit `uninjector-already-clean.test.ts` — missing sentinel returns
  `ok:true, outcome:"already-clean"`.
- Unit `uninjector-idempotent.test.ts` — two sequential
  `uninjectFromTab(tabId)` calls both return `ok:true`; second is
  `already-clean`.
- Unit `uninjector-teardown-failure.test.ts` — one `failed[]` entry from
  `runtime-teardown` blocks sentinel-clear and returns
  `TeardownCallbackFailed`.
- Unit `uninjector-context-invalidated.test.ts` — thrown `Extension
  context invalidated` returns `ExtensionContextInvalidated`, writes NO
  Code Red.
- Unit `uninjector-ack-timeout.test.ts` — 500 ms timeout warns, proceeds
  to runtime-teardown.
- Unit `reinjector.test.ts` — force inject runs only after successful
  uninject.
- Unit `reinjector-failure.test.ts` — failed uninject prevents inject;
  returns `UninjectBeforeReinjectFailed`.
- Unit `reinjector-force-precondition.test.ts` — sentinel present after
  uninject → `ForceInjectPreconditionFailed`, no `executeScript` for
  runtime.
- Unit `uninject-new-tab-guard.test.ts` — guarded URLs skip probe and
  teardown.
- Static `audit-force-inject-callers.test.mjs` — only allowlisted files
  contain `force: true`.
- Component `StatusPanel.inject-actions.test.tsx` —
  Inject/Re-inject/Uninject button states + failure rendering + stale
  build hides `Inject`.
- Manual Chrome E2E: inject → uninject → verify sentinel removed and no
  panel/relay/heartbeat/shortcut/observer remains; re-inject → verify
  single clean runtime.
