# 09 — Injection Idempotency Sentinel

## Why this step exists

The root cause of duplicate panels, duplicate keyboard listeners, duplicate
message relays, and inflated error counts is usually not the injection itself;
it is missing idempotency. MV3 service workers can wake multiple times, users
can click Inject repeatedly, file-watch reload can race with navigation, and
tabs can finish several navigation events for one visible page. Without a
single sentinel contract, the step 08 lifecycle can run twice on the same tab
and leave the page in a half-broken state.

This step defines the one guard that proves whether a tab is already injected.

## Contract

1. **Single sentinel attribute.** The page-level injection marker is stored on
   `document.documentElement` as `data-marco-injected="true"`.
2. **Single build marker.** The same element stores the active build as
   `data-marco-build-id="<BUILD_ID>"`.
3. **Single probe helper.** Background code checks injection state only through
   `probeInjectionSentinel()` / `isAlreadyInjected()`. Do not inline DOM probes
   in popup, status panel, auto-injector, or re-inject code.
4. **Probe before stage 1.** Step 08 must call `isAlreadyInjected()` before
   dependency resolution, storage reads, or script execution unless the request
   is explicitly `force: true`.
5. **Same build means no-op.** If the sentinel exists and build id matches the
   current build, non-forced injection returns success with
   `reason="AlreadyInjected"` and performs no script execution.
6. **Different build means stale.** If the sentinel exists with a different
   build id, normal injection returns `StaleInjectionBuild`. Step 10 owns the
   force re-inject/uninject path that clears stale state first.
7. **New-tab guard still wins.** `isNewTabOrBlankUrl()` runs before sentinel
   probing. Chrome internal pages should not receive an executeScript probe.
8. **No retry.** If the probe fails, return a typed failure and log Code Red
   once. Do not retry, backoff, or attempt a blind injection.
9. **Sentinel is not storage.** Do not mirror this marker into
   `chrome.storage.local`, IndexedDB, SQLite, or localStorage. It is per-page
   runtime state only.

## Constants

```ts
// src/background/injection/sentinel.ts
export const ATTR_INJECTED = "data-marco-injected" as const;
export const ATTR_BUILD_ID = "data-marco-build-id" as const;
export const ATTR_INSTALLED_AT = "data-marco-installed-at" as const;
export const ATTR_SCRIPT_IDS = "data-marco-script-ids" as const;
```

These constants are the only allowed names. UI labels may say "Injected" or
"Not injected", but code must not invent alternate attributes such as
`data-injected`, `data-extension-loaded`, or `window.__injected`.

## Sentinel state contract

```ts
// src/background/injection/sentinel.ts
export interface InjectionSentinelState {
  injected: boolean;
  buildId: string | null;
  installedAtIso: string | null;
  scriptIds: string[];
  reason: "Present" | "Missing" | "Malformed" | "ProbeFailed";
  reasonDetail: string;
}
```

Rules:

- `injected === true` only when `data-marco-injected="true"` and build id is
  non-empty.
- Missing attributes are normal before first injection and return
  `reason="Missing"`; they are not Code Red.
- Malformed script id JSON returns `reason="Malformed"` and `injected=false`.
- Probe exceptions return `reason="ProbeFailed"` and are Code Red.

## Probe implementation

```ts
// src/background/injection/sentinel.ts
import { BUILD_ID } from "@shared/constants";
import { Logger } from "@shared/logger";

export async function probeInjectionSentinel(tabId: number): Promise<InjectionSentinelState> {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      args: [ATTR_INJECTED, ATTR_BUILD_ID, ATTR_INSTALLED_AT, ATTR_SCRIPT_IDS],
      func: (
        injectedAttr: string,
        buildAttr: string,
        installedAtAttr: string,
        scriptIdsAttr: string,
      ): InjectionSentinelState => {
        const root = document.documentElement;
        const injectedValue = root.getAttribute(injectedAttr);
        const buildId = root.getAttribute(buildAttr);
        const installedAtIso = root.getAttribute(installedAtAttr);
        const scriptIdsRaw = root.getAttribute(scriptIdsAttr) ?? "[]";

        if (injectedValue !== "true" && !buildId) {
          return {
            injected: false,
            buildId: null,
            installedAtIso: null,
            scriptIds: [],
            reason: "Missing",
            reasonDetail: "Sentinel attributes are absent on documentElement",
          };
        }

        try {
          const parsedScriptIds = JSON.parse(scriptIdsRaw) as string[];
          return {
            injected: injectedValue === "true" && Boolean(buildId),
            buildId,
            installedAtIso,
            scriptIds: parsedScriptIds,
            reason: "Present",
            reasonDetail: `Sentinel present for build=${buildId ?? "null"}`,
          };
        } catch (caught) {
          const err = caught as CaughtError;
          return {
            injected: false,
            buildId,
            installedAtIso,
            scriptIds: [],
            reason: "Malformed",
            reasonDetail: err?.message ?? `Invalid ${scriptIdsAttr}`,
          };
        }
      },
    });

    return result?.result ?? {
      injected: false,
      buildId: null,
      installedAtIso: null,
      scriptIds: [],
      reason: "ProbeFailed",
      reasonDetail: "chrome.scripting.executeScript returned no sentinel result",
    };
  } catch (caught) {
    const err = caught as CaughtError;
    Logger.error("Injection.SentinelProbeFailed", {
      path: "src/background/injection/sentinel.ts",
      missing: "MAIN-world sentinel probe result",
      Reason: "ProbeFailed",
      ReasonDetail: err?.message ?? "Sentinel probe failed without a message",
      tabId,
      buildId: BUILD_ID,
      SelectorAttempts: [],
      VariableContext: [],
    });

    return {
      injected: false,
      buildId: null,
      installedAtIso: null,
      scriptIds: [],
      reason: "ProbeFailed",
      reasonDetail: err?.message ?? "Sentinel probe failed without a message",
    };
  }
}

export async function isAlreadyInjected(tabId: number): Promise<boolean> {
  const state = await probeInjectionSentinel(tabId);
  return state.injected && state.buildId === BUILD_ID;
}
```

## Mark implementation

The sentinel is written only after step 08 reaches `stage="ready"`. Setting it
earlier would falsely mark a half-injected page as healthy.

```ts
// src/background/injection/sentinel.ts
export async function markInjected(tabId: number, scriptIds: string[]): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    world: "MAIN",
    args: [ATTR_INJECTED, ATTR_BUILD_ID, ATTR_INSTALLED_AT, ATTR_SCRIPT_IDS, BUILD_ID, scriptIds],
    func: (
      injectedAttr: string,
      buildAttr: string,
      installedAtAttr: string,
      scriptIdsAttr: string,
      buildId: string,
      injectedScriptIds: string[],
    ): void => {
      const root = document.documentElement;
      root.setAttribute(injectedAttr, "true");
      root.setAttribute(buildAttr, buildId);
      root.setAttribute(installedAtAttr, new Date().toISOString());
      root.setAttribute(scriptIdsAttr, JSON.stringify(injectedScriptIds));
    },
  });
}
```

Rules:

- Mark only after namespace, relay, runtime IIFEs, communication linking, and
  CSP fallback have completed successfully.
- Include the final script id list actually injected, not the list originally
  requested if fallback changed the result.
- If `markInjected()` fails, the whole injection result is failed. A page that
  cannot be marked cannot be safely considered injected.

## Integration with step 08

```ts
// src/background/injection/injector.ts
const sentinel = await probeInjectionSentinel(request.tabId);

if (!request.force && sentinel.injected && sentinel.buildId === BUILD_ID) {
  return {
    ok: true,
    tabId: request.tabId,
    stage: "ready",
    injectedScriptIds: sentinel.scriptIds,
    buildId: BUILD_ID,
    reason: "AlreadyInjected",
  };
}

if (!request.force && sentinel.injected && sentinel.buildId !== BUILD_ID) {
  return {
    ok: false,
    tabId: request.tabId,
    stage: "guarded",
    reason: "StaleInjectionBuild",
    reasonDetail: `Existing build=${sentinel.buildId ?? "null"}; current build=${BUILD_ID}`,
    buildId: BUILD_ID,
  };
}

// ...run all seven stages...
await markInjected(request.tabId, plan.scriptIds);
```

Status panel behavior from step 07 uses this same state:

- `Present + matching build` → `injected`
- `Missing` → `not-injected`
- `Present + stale build` → `not-injected` with tooltip `StaleInjectionBuild`
- `ProbeFailed` → `error` with `ReasonDetail`

## Clearing is not owned by this step

This step does not define uninject. It only defines how injection is detected
and marked. Step 10 owns safe removal of:

- `data-marco-injected`
- `data-marco-build-id`
- `data-marco-installed-at`
- `data-marco-script-ids`
- listeners, timers, observers, relays, panels, and CSS nodes

Do not clear the sentinel as a quick fix during normal injection. A stale
sentinel is a signal to use the explicit re-inject flow.

## Diagnostics

Every sentinel transition should be visible in the injection diagnostics stream:

- `Sentinel.Missing` — debug/info only, no Code Red.
- `Sentinel.Present` — include build id, installed time, and script id count.
- `Sentinel.StaleBuild` — warn-level diagnostic; no blind overwrite.
- `Sentinel.ProbeFailed` — Code Red with exact path and `ReasonDetail`.
- `Sentinel.MarkFailed` — Code Red and failed injection result.

Console mirroring must use the centralized injection diagnostics grouping, not
ad-hoc `console.log` calls.

## Pitfalls

- **Using a global variable only** — `window.__injected` can be lost across
  worlds and is hard to inspect. The DOM attribute is the source of truth.
- **Setting the sentinel at bootstrap** — this marks a page injected before the
  relay and runtime are ready. Mark only after the lifecycle reaches `ready`.
- **Treating stale build as success** — old injected code can have incompatible
  message contracts. Return `StaleInjectionBuild` and let step 10 handle force.
- **Clearing the sentinel automatically** — that hides half-injected bugs and
  bypasses teardown. Use explicit uninject/re-inject.
- **Probing chrome/new-tab pages** — Chrome will reject the script call. Run the
  new-tab guard first.
- **Duplicating sentinel checks in UI code** — all consumers call the helper so
  error handling and Code Red behavior stay consistent.

## Acceptance

- [ ] `data-marco-injected="true"` and `data-marco-build-id` are written only
      after successful lifecycle completion.
- [ ] Non-forced injection skips all script execution when matching sentinel is
      present.
- [ ] Stale build returns `StaleInjectionBuild` and does not overwrite the page.
- [ ] New-tab/blank URLs are guarded before sentinel probing.
- [ ] Probe failure logs Code Red once with path, missing item, `Reason`,
      `ReasonDetail`, tab id, build id, `SelectorAttempts`, and
      `VariableContext`.
- [ ] Status panel uses the same sentinel helper and does not duplicate probing.
- [ ] No sentinel state is stored in `chrome.storage.local`, IndexedDB, SQLite,
      or localStorage.

## Tests to ship with this step

- Unit: `sentinel.test.ts` — asserts missing, present, malformed, stale-build,
  and probe-failed states.
- Unit: `injector-idempotency.test.ts` — asserts matching sentinel returns
  success without calling resolver or `chrome.scripting.executeScript()` for
  runtime files.
- Unit: `injector-stale-build.test.ts` — asserts stale build blocks normal
  injection and requires the step 10 force path.
- Unit: `injector-new-tab-before-sentinel.test.ts` — asserts guarded URLs never
  call `probeInjectionSentinel()`.
- Manual Chrome E2E: click Inject twice on the same HTTPS tab and verify one
  panel, one relay, one keyboard listener set, and one sentinel marker.