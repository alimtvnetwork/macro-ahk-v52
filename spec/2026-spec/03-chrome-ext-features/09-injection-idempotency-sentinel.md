# 09 — Injection Idempotency Sentinel

## Why this step exists

The root cause of duplicate panels, duplicate keyboard listeners, duplicate
message relays, and inflated error counts is usually not the injection
itself; it is missing idempotency. MV3 service workers wake multiple times,
users click Inject repeatedly, file-watch reload races with navigation, and
tabs finish several navigation events for one visible page. Without a
single sentinel contract, the step 08 lifecycle can run twice on the same
tab and leave the page in a half-broken state.

This step defines the one guard that proves whether a tab is already
injected, plus the per-tab in-flight mutex that prevents concurrent
pipeline runs from racing each other's `markInjected()`.

## Contract

1. **Single sentinel attribute.** Page-level marker is `data-marco-injected="true"`
   on `document.documentElement` (top frame only).
2. **Single build marker.** Same element stores
   `data-marco-build-id="<BUILD_ID>"`.
3. **Single probe helper.** Background code checks injection state only
   through `probeInjectionSentinel()` / `isAlreadyInjected()`. No inline
   DOM probes in popup, status panel, auto-injector, or re-inject code.
4. **Top frame only.** The sentinel lives on the top frame's
   `documentElement`. Iframe / cross-origin frame injection requests
   return `Reason="UnsupportedFrameTarget"` and never write the sentinel.
5. **Per-tab in-flight mutex.** `injector.ts` holds an
   `inFlight: Map<number, Promise<InjectionResult>>`. Concurrent calls for
   the same `tabId` await the existing promise — they do not start a
   second pipeline (§Mutex).
6. **Probe before stage 1.** Step 08 must call `isAlreadyInjected()` before
   dependency resolution, storage reads, or script execution unless the
   request is `force: true`.
7. **Same build = no-op.** Sentinel present and build id matches → returns
   `InjectionOutcome="already-injected"` (see §Result discriminator); no
   script execution.
8. **Different build = `"build-mismatch"`.** Sentinel present with a
   different build id → `isAlreadyInjected()` returns `"build-mismatch"`
   (tri-state — see §Probe signature). Normal injection returns
   `Reason="StaleInjectionBuild"`; step 10 owns the uninject-then-force
   path.
9. **New-tab guard still wins.** `isNewTabOrBlankUrl()` runs before
   sentinel probing.
10. **No retry.** Probe failure returns typed failure and logs Code Red
    once. No retry, no backoff, no blind injection.
11. **Sentinel is not storage.** Never mirror to `chrome.storage.local`,
    IndexedDB, SQLite, or localStorage. Per-page runtime state only.
12. **Metadata only.** The probe MUST NOT capture
    `document.documentElement.outerHTML`, page text, or form values —
    regardless of the per-project `VerboseLogging` toggle. Sentinel logs
    are metadata only (`mem://standards/verbose-logging-and-failure-diagnostics`).
13. **Wall-clock vs display.** `installedAtIso` is UTC ISO from
    `new Date().toISOString()`. UI converts it via `formatRelativeLocal()`
    using the user's local timezone at render time only.
14. **`func:` form intentional.** Probe/mark/clear use the `func:` form
    (not `files:`) so the sentinel is atomic across builds and adds no
    `web_accessible_resources` entry. No `@shared/*` imports are
    available inside `func` — only its serialized JSON `args`.

## Constants

```ts
// src/background/injection/sentinel.ts
export const ATTR_INJECTED      = "data-marco-injected"     as const;
export const ATTR_BUILD_ID      = "data-marco-build-id"     as const;
export const ATTR_INSTALLED_AT  = "data-marco-installed-at" as const;
export const ATTR_SCRIPT_IDS    = "data-marco-script-ids"   as const;
export const ATTR_SCRIPT_HASH   = "data-marco-script-hash"  as const;  // overflow path

export const MAX_SENTINEL_SCRIPT_IDS = 64;
```

Alternate names (`data-injected`, `data-extension-loaded`, `window.__injected`)
are forbidden.

## Result discriminator (consumed by step 08)

```ts
// src/background/injection/types.ts (extends step 08)
export type InjectionOutcome = "fresh" | "already-injected" | "guarded";

export interface InjectionSuccess {
  ok: true;
  tabId: number;
  stage: "ready";
  outcome: InjectionOutcome;
  injectedScriptIds: string[];
  buildId: string;
  reason?: string;            // optional descriptor, e.g. "AlreadyInjected"
}
```

`reason` on the success branch is documented and optional; UI/diagnostics
key off `outcome`, not `reason`.

## Sentinel state contract

```ts
export interface InjectionSentinelState {
  injected: boolean;
  buildId: string | null;
  installedAtIso: string | null;        // UTC ISO; display formatted at render
  scriptIds: string[];                  // empty when overflow path used
  scriptIdsHash: string | null;         // sha1 prefix when overflow
  scriptIdsCount: number;
  reason: "Present" | "Missing" | "Malformed" | "ProbeFailed" | "UnsupportedFrameTarget";
  reasonDetail: string;
}
```

Rules:

- `injected === true` only when `data-marco-injected="true"` and build id
  is non-empty.
- Missing attributes return `reason="Missing"` (not Code Red — normal
  pre-injection state).
- Malformed JSON returns `reason="Malformed"` and `injected=false`.
- Probe exceptions return `reason="ProbeFailed"` and write one Code Red.
- Iframe / non-top-frame targets return
  `reason="UnsupportedFrameTarget"` and write one Code Red per
  `(tabId, frameId)` per SW lifetime.

## Probe signature (tri-state)

```ts
export type SentinelDecision = boolean | "build-mismatch";

export async function isAlreadyInjected(tabId: number): Promise<SentinelDecision>;
export async function probeInjectionSentinel(tabId: number): Promise<InjectionSentinelState>;
```

Step 08 branches:

| `isAlreadyInjected` returns | Step 08 action |
|---|---|
| `true` | `outcome:"already-injected"` no-op |
| `false` | run full pipeline, `outcome:"fresh"` |
| `"build-mismatch"` | call `uninjectFromTab()` (step 10) then full pipeline |

## Probe implementation

```ts
// src/background/injection/sentinel.ts
import { BUILD_ID } from "@shared/constants";
import { Logger } from "@shared/logger";
import { toCaughtError } from "@shared/errors";

export async function probeInjectionSentinel(tabId: number): Promise<InjectionSentinelState> {
  try {
    const frames = await chrome.scripting.executeScript({
      target: { tabId, frameIds: [0] },           // top frame only
      world: "MAIN",
      args: [ATTR_INJECTED, ATTR_BUILD_ID, ATTR_INSTALLED_AT, ATTR_SCRIPT_IDS, ATTR_SCRIPT_HASH],
      // NOTE: `func` is serialized; no @shared/* imports are available inside.
      // Args are JSON-serialised in declared order; arity is asserted by tests.
      func: (iAttr, bAttr, tAttr, sAttr, hAttr) => {
        const root = document.documentElement;
        if (!root) {
          return {
            injected: false, buildId: null, installedAtIso: null,
            scriptIds: [], scriptIdsHash: null, scriptIdsCount: 0,
            reason: "ProbeFailed", reasonDetail: "documentElement absent",
          };
        }
        const injectedValue = root.getAttribute(iAttr);
        const buildId       = root.getAttribute(bAttr);
        const installedAt   = root.getAttribute(tAttr);
        const raw           = root.getAttribute(sAttr) ?? "[]";
        const hash          = root.getAttribute(hAttr);

        if (injectedValue !== "true" && !buildId) {
          return {
            injected: false, buildId: null, installedAtIso: null,
            scriptIds: [], scriptIdsHash: null, scriptIdsCount: 0,
            reason: "Missing", reasonDetail: "Sentinel attributes absent",
          };
        }
        try {
          const parsed = JSON.parse(raw) as string[];
          return {
            injected: injectedValue === "true" && Boolean(buildId),
            buildId, installedAtIso: installedAt,
            scriptIds: parsed,
            scriptIdsHash: hash,
            scriptIdsCount: hash ? Number(hash.split(",count:")[1] ?? parsed.length) : parsed.length,
            reason: "Present",
            reasonDetail: `Present build=${buildId ?? "null"}`,
          };
        } catch (e) {
          return {
            injected: false, buildId, installedAtIso: installedAt,
            scriptIds: [], scriptIdsHash: hash, scriptIdsCount: 0,
            reason: "Malformed",
            reasonDetail: (e instanceof Error ? e.message : "Invalid script-ids JSON"),
          };
        }
      },
    });

    // Explicit empty-frames guard (sandboxed iframes / no result rows).
    if (!frames || frames.length === 0) {
      return {
        injected: false, buildId: null, installedAtIso: null,
        scriptIds: [], scriptIdsHash: null, scriptIdsCount: 0,
        reason: "ProbeFailed", reasonDetail: "no frame result",
      };
    }
    return frames[0].result ?? {
      injected: false, buildId: null, installedAtIso: null,
      scriptIds: [], scriptIdsHash: null, scriptIdsCount: 0,
      reason: "ProbeFailed", reasonDetail: "frame returned no sentinel result",
    };
  } catch (caught) {
    const err = toCaughtError(caught);
    Logger.error("Injection.SentinelProbeFailed", {
      Path: "src/background/injection/sentinel.ts",
      Missing: "MAIN-world sentinel probe result",
      Reason: "ProbeFailed",
      ReasonDetail: err.message ?? "Sentinel probe failed without a message",
      TabId: tabId, BuildId: BUILD_ID,
      SelectorAttempts: null, VariableContext: null,
    });
    return {
      injected: false, buildId: null, installedAtIso: null,
      scriptIds: [], scriptIdsHash: null, scriptIdsCount: 0,
      reason: "ProbeFailed",
      reasonDetail: err.message ?? "Sentinel probe failed without a message",
    };
  }
}

export async function isAlreadyInjected(tabId: number): Promise<SentinelDecision> {
  const state = await probeInjectionSentinel(tabId);
  if (!state.injected) { return false; }
  return state.buildId === BUILD_ID ? true : "build-mismatch";
}
```

## Mutex (per-tab in-flight)

```ts
// src/background/injection/injector.ts (excerpt)
const inFlight = new Map<number, Promise<InjectionResult>>();

export function injectIntoTab(req: InjectionRequest): Promise<InjectionResult> {
  const existing = inFlight.get(req.tabId);
  if (existing) { return existing; }              // join the in-flight pipeline
  const run = runPipeline(req).finally(() => inFlight.delete(req.tabId));
  inFlight.set(req.tabId, run);
  return run;
}
```

Two `injectIntoTab` calls within the same pipeline window for the same
`tabId` resolve to the **same** `InjectionResult`. `markInjected()` cannot
be overwritten by a racing second pipeline because there is no second
pipeline.

## Mark implementation

```ts
export async function markInjected(tabId: number, scriptIds: string[]): Promise<void> {
  // Overflow safety: cap to MAX_SENTINEL_SCRIPT_IDS; encode count+hash.
  const overflow = scriptIds.length > MAX_SENTINEL_SCRIPT_IDS;
  const payload  = overflow ? [] : scriptIds;
  const hash     = overflow ? `sha1:${await sha1Prefix(scriptIds.join("|"))},count:${scriptIds.length}` : "";

  await chrome.scripting.executeScript({
    target: { tabId, frameIds: [0] },
    world: "MAIN",
    args: [ATTR_INJECTED, ATTR_BUILD_ID, ATTR_INSTALLED_AT, ATTR_SCRIPT_IDS, ATTR_SCRIPT_HASH, BUILD_ID, payload, hash],
    func: (iA, bA, tA, sA, hA, buildId, ids, hashStr) => {
      const root = document.documentElement;
      root.setAttribute(iA, "true");
      root.setAttribute(bA, buildId);
      root.setAttribute(tA, new Date().toISOString());   // UTC; UI formats display
      root.setAttribute(sA, JSON.stringify(ids));
      if (hashStr) { root.setAttribute(hA, hashStr); }
    },
  });
}
```

Rules:

- Mark only after lifecycle reaches `ready`.
- Use the final script id list actually injected (post-fallback), not the
  originally requested list.
- If `markInjected()` fails, the whole injection result is failed.
- Page replacing `<html>` via `document.write` after mark → next probe
  returns `Missing` → re-inject path engages. This is intentional and not
  Code Red.

## Diagnostics (rate-limited)

| Event | Severity | Rate limit |
|---|---|---|
| `Sentinel.Missing` | debug | unlimited (cheap) |
| `Sentinel.Present` | info | **1 per `(tabId, buildId)` per SW lifetime** (dedup set on `globalThis`) |
| `Sentinel.StaleBuild` | warn | 1 per `(tabId, priorBuildId)` per SW lifetime |
| `Sentinel.UnsupportedFrameTarget` | warn | 1 per `(tabId, frameId)` per SW lifetime |
| `Sentinel.ProbeFailed` | Code Red | always |
| `Sentinel.MarkFailed` | Code Red | always |

Console mirroring uses the centralized injection diagnostics group, never
ad-hoc `console.log`.

## Pitfalls

- **Global variable only** (`window.__injected`) — lost across worlds, hard
  to inspect. DOM attribute is source of truth.
- **Marking at bootstrap** — marks a page injected before relay/runtime
  ready. Mark only at `ready`.
- **Treating stale build as success** — old code can have incompatible
  message contracts.
- **Clearing automatically** during normal injection — hides half-injected
  bugs.
- **Probing chrome/new-tab pages** — Chrome rejects. New-tab guard runs
  first.
- **Duplicating sentinel checks in UI** — all consumers call the helper.
- **Racing pipelines** — two `inject` calls within 50 ms without the
  mutex → double `markInjected`. Mutex is mandatory.
- **Iframe sentinel** — `documentElement` only marks the top frame.
  Iframe requests return `UnsupportedFrameTarget`.
- **Outerhtml capture** — never. Sentinel is metadata only, regardless of
  `VerboseLogging`.
- **`installedAt` timezone confusion** — sentinel writes UTC; UI converts
  using the user's local timezone at render only.
- **`func` arity drift** — `args` is positional JSON; a test asserts
  `probe.length === args.length` and `mark.length === args.length`.

## Acceptance

- [ ] `data-marco-injected="true"` and `data-marco-build-id` written only
      after successful lifecycle completion.
- [ ] Non-forced injection skips script execution when matching sentinel
      present; result carries `outcome:"already-injected"`.
- [ ] Stale build surfaces `"build-mismatch"` from `isAlreadyInjected()`;
      step 08 uninjects first.
- [ ] New-tab/blank URLs guarded before sentinel probing.
- [ ] Probe failure logs Code Red once with mandatory fields (`Path`,
      `Missing`, `Reason`, `ReasonDetail`, `TabId`, `BuildId`,
      `SelectorAttempts:null`, `VariableContext:null`).
- [ ] Per-tab mutex collapses concurrent `injectIntoTab(sameTabId)` to
      one pipeline → one `markInjected`.
- [ ] Sentinel probe NEVER captures `outerHTML` regardless of verbose
      toggle.
- [ ] `installedAtIso` is UTC; UI formats using the user's local timezone at render.
- [ ] Script-id list > `MAX_SENTINEL_SCRIPT_IDS` stores
      `data-marco-script-hash` + count instead of full array.
- [ ] Iframe / non-top-frame requests return
      `Reason="UnsupportedFrameTarget"` and never write the sentinel.
- [ ] `Sentinel.Present` logs at most once per `(tabId, buildId)` per SW
      lifetime.
- [ ] Status panel uses the same helper; no duplicate probing.
- [ ] No sentinel state in `chrome.storage.local`, IndexedDB, SQLite, or
      localStorage.

## Tests to ship with this step

- Unit `sentinel.test.ts` — Missing/Present/Malformed/StaleBuild/ProbeFailed.
- Unit `sentinel-empty-frames.test.ts` — empty `frames[]` from sandboxed
  iframe target returns `ProbeFailed reasonDetail="no frame result"`.
- Unit `sentinel-tri-state.test.ts` — `isAlreadyInjected` returns
  `true | false | "build-mismatch"` correctly.
- Unit `sentinel-arity.test.ts` — `probe.func.length === args.length` and
  `mark.func.length === args.length`.
- Unit `sentinel-overflow.test.ts` — 200 ids → `data-marco-script-hash`
  encoded, `data-marco-script-ids="[]"`, probe round-trips
  `scriptIdsCount=200`.
- Unit `sentinel-present-log-dedup.test.ts` — 10 probes for same
  `(tabId, buildId)` → 1 `Sentinel.Present` log.
- Unit `sentinel-iframe-reject.test.ts` — `frameId !== 0` request returns
  `UnsupportedFrameTarget`, never calls `executeScript`.
- Unit `injector-mutex.test.ts` — two concurrent `injectIntoTab(tabId=1)`
  calls → one pipeline run, same `InjectionResult` instance.
- Unit `injector-idempotency.test.ts` — matching sentinel → no resolver,
  no runtime `executeScript`.
- Unit `injector-stale-build.test.ts` — stale build → step 10 uninject
  called before stage 1.
- Unit `injector-new-tab-before-sentinel.test.ts` — guarded URLs never
  call `probeInjectionSentinel()`.
- Manual Chrome E2E: click Inject twice rapidly on same HTTPS tab → one
  panel, one relay, one keyboard listener set, one sentinel marker.

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

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

