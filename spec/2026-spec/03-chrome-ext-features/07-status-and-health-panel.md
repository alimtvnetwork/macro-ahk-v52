# 07 — Status and Health Panel

## Why this step exists

A user looking at the popup needs to answer five questions in under three
seconds, without console access: *Is the extension alive? Which build? Is it
injected into the current tab? Is anything broken? When was the last
heartbeat?* If those answers are not visible, every bug becomes a
"reload-and-pray" session. This step pins the contract for the Status &
Health panel on the popup's primary surface.

## Contract

1. **Always visible on Home tab.** The status panel renders at the top of
   the popup's default view — not behind a "Diagnostics" link, not behind a
   gear icon. It is the first thing a user sees.
2. **Five required rows**, in this order:
   1. **Build** — `BUILD_ID` (step 04) with click-to-copy.
   2. **Service worker** — `alive | sleeping | error` from a ping probe.
   3. **Active tab injection** — `injected | not-injected | n/a (chrome:// url)`
      from the sentinel probe (step 09).
   4. **Errors (last 24h)** — count + click → opens Errors panel (step 13).
   5. **Last heartbeat** — relative time (`3s ago`), updated every 2s.
3. **Dev-only sixth row**: `Dev watcher: connected | disconnected` (step 06).
   Hidden in production builds (`import.meta.env.DEV` only).
4. **Action buttons**, in a sticky footer row:
   - `Reload Extension` (step 05)
   - `Inject` / `Re-inject` / `Uninject` (steps 09, 10)
   - `Open Detailed View` → routes to `/popup/details`
5. **Polling discipline.** Status data refreshes on a 2 s `setInterval`,
   **paused when `document.hidden === true`**, and torn down on `pagehide`
   and unmount (`mem://standards/timer-and-observer-teardown`).
6. **Each probe is single-shot fail-fast.** 300 ms cap, single attempt,
   no retry (`mem://constraints/no-retry-policy`). Row shows `error` with
   tooltip carrying `Reason+ReasonDetail`.
7. **Code-Red dedup.** A probe that fails writes one Code Red row per
   `(probeName, reason)` per **SW lifetime** (see §Dedup scope).
8. **Empty-state never blank.** If `chrome.runtime` is unavailable
   (Lovable preview, iframe), render `"Preview mode — chrome.* APIs
   unavailable"` instead of unmounting to a blank div.
9. **Dark-only tokens.** All colors come from semantic Tailwind tokens
   (`bg-success/15 text-success`, `bg-destructive/15 text-destructive`,
   `bg-muted text-muted-foreground`). Raw palette classes
   (`text-red-500`, `bg-green-200`, …) are forbidden
   (`mem://preferences/dark-only-theme`).

## Row data contract

```ts
// src/popup/status/types.ts
import { BUILD_ID } from "@shared/constants";

export type WorkerState = "alive" | "sleeping" | "error";
export type TabState    = "injected" | "not-injected" | "n/a" | "error";
export type WatcherState = "connected" | "disconnected";

export interface StatusSnapshot {
  buildId: string;
  worker: { state: WorkerState; reason?: string };
  tab:    { state: TabState; url?: string; reason?: string };
  errors: { last24h: number };
  heartbeatIso: string;
  devWatcher?: { state: WatcherState };          // dev builds only
}

export const INITIAL_SNAPSHOT: StatusSnapshot = {
  buildId: BUILD_ID,
  worker:  { state: "sleeping" },
  tab:     { state: "n/a" },
  errors:  { last24h: 0 },
  heartbeatIso: new Date(0).toISOString(),       // 1970 → "never" in <RelativeTime/>
};
```

`buildId` in the snapshot is **always** set client-side from
`@shared/constants` — never trusted from the SW reply. This defends against
a stale SW answering after the build flipped
(`mem://architecture/injection-cache-management`).

## Internal components (mandatory primitives)

All four primitives live in `src/popup/components/status/` and are
exhaustively typed.

| Component | Props | Notes |
|---|---|---|
| `<Row label>{children}` | `label: string; children: ReactNode` | grid row; label `text-muted-foreground`, value right-aligned |
| `<Pill tone>{text}` | `tone: Tone; title?: string; children: ReactNode` | inline-block, rounded, tone classes table below |
| `<RelativeTime iso>` | `iso: string` | "Xs ago", "never" when `iso === 1970`, retints via `heartbeatTone(iso)` |
| `<VersionBadge>` | `{}` | renders `BUILD_ID`, click → `navigator.clipboard.writeText(BUILD_ID)`; toast on success |

### Tone resolver

```ts
// src/popup/components/status/tone.ts
export type Tone = "success" | "warning" | "danger" | "muted" | "neutral";

export function tone(state: WorkerState | TabState | WatcherState): Tone {
  switch (state) {
    case "alive":
    case "injected":
    case "connected":     return "success";
    case "sleeping":
    case "not-injected":  return "muted";
    case "error":
    case "disconnected":  return "danger";
    case "n/a":           return "neutral";
  }
}

const CLASS: Record<Tone, string> = {
  success:  "bg-success/15 text-success",
  warning:  "bg-warning/15 text-warning",
  danger:   "bg-destructive/15 text-destructive",
  muted:    "bg-muted text-muted-foreground",
  neutral:  "bg-muted/40 text-foreground/60",
};
export function toneClass(t: Tone): string { return CLASS[t]; }
```

### Heartbeat freshness thresholds (normative)

```ts
// src/popup/components/status/heartbeat-tone.ts
export function heartbeatTone(iso: string): Tone {
  const ageMs = Date.now() - new Date(iso).getTime();
  if (ageMs > 30_000) { return "danger"; }      // also forces one worker:error Code Red
  if (ageMs > 10_000) { return "warning"; }
  return "success";
}
```

When `heartbeatTone === "danger"`, the hook MUST set
`snap.worker = { state: "error", reason: "HeartbeatStale" }` and the
probe-failure-dedup pipeline writes one Code Red.

## Routing contract

The popup uses **hash routing** (`HashRouter` from react-router) so it
works inside the file-less popup HTML. Routes:

```ts
// src/popup/routes.ts
import { useNavigate } from "react-router-dom";

export const ROUTE_HOME    = "/";
export const ROUTE_DETAILS = "/details";
export const ROUTE_ERRORS  = "/errors";

export function useOpenErrorsPanel() {
  const navigate = useNavigate();
  return () => navigate(ROUTE_ERRORS);
}
```

No raw `href="#/..."` anchors — every navigation goes through
`useNavigate()` so the router controls history.

## Reference component

```tsx
// src/popup/components/StatusPanel.tsx — Rules-of-Hooks compliant
import { BUILD_ID } from "@shared/constants";
import { useStatusSnapshot } from "../status/useStatusSnapshot";
import { isExtensionPopup } from "../lib/extension-env";
import { Row, Pill, RelativeTime, VersionBadge } from "./status";
import { tone } from "./status/tone";
import { useOpenErrorsPanel, ROUTE_DETAILS } from "../routes";
import { ReloadButton } from "./ReloadButton";
import { InjectButton } from "./InjectButton";
import { useNavigate } from "react-router-dom";

function PreviewPanel() {
  return (
    <section role="status" className="p-3 text-sm text-muted-foreground">
      Preview mode — <code>chrome.*</code> APIs unavailable.
      Build <code>{BUILD_ID}</code>.
    </section>
  );
}

function LivePanel() {
  const snap = useStatusSnapshot();
  const openErrors = useOpenErrorsPanel();
  const navigate = useNavigate();
  return (
    <section role="status" className="flex flex-col gap-2 p-3 border-b bg-background">
      <Row label="Build"><VersionBadge /></Row>
      <Row label="Service worker">
        <Pill tone={tone(snap.worker.state)} title={snap.worker.reason}>{snap.worker.state}</Pill>
      </Row>
      <Row label="Active tab">
        <Pill tone={tone(snap.tab.state)} title={snap.tab.reason}>{snap.tab.state}</Pill>
      </Row>
      <Row label="Errors (24h)">
        <button onClick={openErrors} data-testid="open-errors">{snap.errors.last24h}</button>
      </Row>
      <Row label="Last heartbeat"><RelativeTime iso={snap.heartbeatIso} /></Row>
      {snap.devWatcher && (
        <Row label="Dev watcher">
          <Pill tone={tone(snap.devWatcher.state)}>{snap.devWatcher.state}</Pill>
        </Row>
      )}
      <footer className="flex gap-2 pt-2 sticky bottom-0 bg-background">
        <ReloadButton source="popup" />
        <InjectButton tabState={snap.tab.state} />
        <button onClick={() => navigate(ROUTE_DETAILS)} data-testid="open-details">
          Open Detailed View
        </button>
      </footer>
    </section>
  );
}

export function StatusPanel() {
  // No hook calls before this branch — both branches always render one of two
  // sibling components, each with its own hook context. Rules-of-Hooks safe.
  return isExtensionPopup() ? <LivePanel /> : <PreviewPanel />;
}
```

## Probe handler (background)

```ts
// src/background/handlers/status-probe-handler.ts
import { MSG_STATUS_PROBE } from "@shared/messages";
import { isAlreadyInjected } from "../injection/sentinel";
import { isNewTabOrBlankUrl } from "@shared/url-utils";
import { countErrorsSince } from "../errors/error-store";
import { toCaughtError } from "@shared/errors";
import { writeCodeRedOnce } from "../errors/dedup";

export function bindStatusProbeHandler(): void {
  chrome.runtime.onMessage.addListener((req, _sender, send) => {
    if (req?.kind !== MSG_STATUS_PROBE) { return false; }
    void respond(send);
    return true;                                   // async response
  });
}

async function respond(send: (r: unknown) => void): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let tabState: "injected" | "not-injected" | "n/a" | "error" = "n/a";
  let tabReason: string | undefined;
  try {
    if (tab?.id && tab.url && !isNewTabOrBlankUrl(tab.url)) {
      tabState = (await isAlreadyInjected(tab.id)) ? "injected" : "not-injected";
    }
  } catch (caught) {
    const err = toCaughtError(caught);
    tabState = "error";
    tabReason = err.message ?? "probe-threw";
    await writeCodeRedOnce("status.tabProbe", "TabProbeFailed", {
      Path: "src/background/handlers/status-probe-handler.ts",
      Missing: "tab injection sentinel reply",
      Reason: "TabProbeFailed",
      ReasonDetail: tabReason,
      SelectorAttempts: null,
      VariableContext: null,
    });
  }

  let errCount = 0;
  try { errCount = await countErrorsSince(Date.now() - 86_400_000); }
  catch (caught) {
    const err = toCaughtError(caught);
    await writeCodeRedOnce("status.errorCount", "ErrorStoreUnavailable", {
      Path: "src/background/errors/error-store.ts",
      Missing: "error_events table read",
      Reason: "ErrorStoreUnavailable",
      ReasonDetail: err.message ?? "countErrorsSince threw",
      SelectorAttempts: null,
      VariableContext: null,
    });
  }

  // buildId intentionally omitted; client patches from @shared/constants.
  send({
    worker: { state: "alive" },
    tab:    { state: tabState, url: tab?.url, reason: tabReason },
    errors: { last24h: errCount },
    heartbeatIso: new Date().toISOString(),
  });
}
```

### Dedup scope

```ts
// src/background/errors/dedup.ts
declare global {
  // eslint-disable-next-line no-var
  var __statusProbeDedup: Set<string> | undefined;
}
function dedupSet(): Set<string> {
  // Reset implicitly on every SW startup (module re-evaluated).
  return (globalThis.__statusProbeDedup ??= new Set());
}
export async function writeCodeRedOnce(probeName: string, reason: string, row: CodeRedRow): Promise<void> {
  const key = `${probeName}::${reason}`;
  if (dedupSet().has(key)) { return; }
  dedupSet().add(key);
  await writeCodeRed(row);
}
```

"Session" is defined as **one SW lifetime** — the dedup set lives on
`globalThis` inside the SW module and reinitializes each cold start.

## Errors source

`countErrorsSince` reads the `error_events` table from session SQLite
(step 16 *(pending)*) per `mem://architecture/data-storage-layers`. On
schema-missing or store-unavailable, it returns `0` and the dedup-aware
helper emits one `ErrorStoreUnavailable` Code Red per SW lifetime.

## Polling hook

```ts
// src/popup/status/useStatusSnapshot.ts
import { useEffect, useState } from "react";
import { MSG_STATUS_PROBE } from "@shared/messages";
import { BUILD_ID } from "@shared/constants";
import { sendRuntimeMessageSafe } from "@platform/messaging";
import { INITIAL_SNAPSHOT, type StatusSnapshot } from "./types";
import { heartbeatTone } from "../components/status/heartbeat-tone";

const POLL_MS = 2_000;
const TIMEOUT_MS = 300;

export function useStatusSnapshot(): StatusSnapshot {
  const [snap, setSnap] = useState<StatusSnapshot>(INITIAL_SNAPSHOT);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (document.hidden) { return; }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort("probe-timeout"), TIMEOUT_MS);
      try {
        const reply = await sendRuntimeMessageSafe(
          { kind: MSG_STATUS_PROBE }, { signal: ctrl.signal },
        );
        if (cancelled) { return; }
        if (!reply.ok || !reply.data) {
          setSnap((s) => ({ ...s, worker: { state: "error", reason: reply.reason ?? "probe-timeout" } }));
          return;
        }
        // buildId is always client-injected; reply.buildId (if present) is discarded.
        const next: StatusSnapshot = { ...(reply.data as StatusSnapshot), buildId: BUILD_ID };
        if (heartbeatTone(next.heartbeatIso) === "danger") {
          next.worker = { state: "error", reason: "HeartbeatStale" };
        }
        setSnap(next);
      } finally { clearTimeout(t); }
    };

    void tick();
    const timer = setInterval(() => { void tick(); }, POLL_MS);
    const onPageHide = () => { clearInterval(timer); };
    window.addEventListener("pagehide", onPageHide);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return snap;
}
```

## Pitfalls

- **Polling at 100 ms** — drains battery, floods SW. 2 s is the floor.
- **Hooks called after an early-return branch** — violates Rules of Hooks.
  Split into `<LivePanel/>` / `<PreviewPanel/>` siblings.
- **Promise.race + setTimeout without clearTimeout** — leaks timer into a
  stale closure. Use `AbortController` + `try/finally`.
- **Never tearing down the interval** — leaks per popup open/close cycle.
- **Raw palette colors** (`text-red-500`) — violates dark-only token rule.
  Use `tone()` → `toneClass()`.
- **Absolute timestamps** instead of `<RelativeTime/>` — users can't
  compute drift.
- **Trusting `reply.buildId`** — a stale SW from a previous build can lie.
  Always overwrite with `BUILD_ID` from `@shared/constants`; on mismatch
  surface `worker: error` `Reason="BuildIdMismatch"`.
- **Unmounting to blank when `chrome` is missing** — render preview placeholder.
- **Flapping Code Red rows** from a chatty probe — dedup
  `(probeName, reason)` per SW lifetime.

## Acceptance

- [ ] Status panel is the first visible element in the popup Home tab.
- [ ] All five required rows render with non-empty values within 300 ms of
      popup open.
- [ ] Build id click copies to clipboard via `<VersionBadge>`.
- [ ] Errors-row click calls `useOpenErrorsPanel()` → `/errors`.
- [ ] Polling pauses when `document.hidden` and tears down on `pagehide`
      and unmount; no timer/listener leaks across mount cycles.
- [ ] Probe failure surfaces a tooltip with `Reason+ReasonDetail` and logs
      exactly one Code Red per `(probeName, reason)` per SW lifetime.
- [ ] Heartbeat > 10 s tones `warning`; > 30 s tones `danger` and forces
      one `HeartbeatStale` Code Red.
- [ ] `snap.buildId` always equals `BUILD_ID`; any reply `buildId` mismatch
      surfaces `worker: error / BuildIdMismatch`.
- [ ] Dev watcher row absent from the production build (`import.meta.env.PROD`).
- [ ] Preview/no-chrome environment shows the placeholder, not a blank div.
- [ ] No raw Tailwind palette classes; lint rule `no-raw-palette-colors`
      passes.

## Tests to ship with this step

- Component: `StatusPanel.test.tsx` — asserts the five rows render, the
  placeholder renders when `chrome` is undefined, and that the component
  obeys Rules of Hooks (`react-hooks/rules-of-hooks` lint clean).
- Component perf: `StatusPanel.perf.test.tsx` — first paint < 50 ms with
  mocked probe; full snapshot rendered < 300 ms.
- Hook: `useStatusSnapshot.test.ts` — fake timers; asserts pause on
  `document.hidden`, cleanup on `pagehide` and unmount, 300 ms
  `AbortController` timeout falls back to `worker.state="error"`, no
  timer leaks across remounts.
- Hook: `useStatusSnapshot.buildId.test.ts` — reply `buildId` is ignored;
  mismatch surfaces `BuildIdMismatch`.
- Handler: `status-probe-handler.test.ts` — asserts response shape,
  `n/a` on `chrome://newtab/` via `isNewTabOrBlankUrl()`, dedup writes
  exactly one Code Red per `(probeName, reason)` across many ticks.
- Tone: `tone.test.ts` — every `WorkerState | TabState | WatcherState` maps
  to a defined tone class; no `text-red-*` / `text-green-*` substrings.
- Manual E2E: open popup on `chrome://newtab/` → "Active tab" reads `n/a`;
  switch to a normal HTTPS URL with injection → reads `injected`; kill SW
  → row flips to `error` within 30 s with `HeartbeatStale`.

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
