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
   Hidden in production builds.
4. **Action buttons**, in a sticky footer row:
   - `Reload Extension` (step 05)
   - `Inject` / `Re-inject` / `Uninject` (steps 09, 10)
   - `Open Detailed View` → routes to `/popup/details`
5. **Polling discipline.** Status data refreshes on a 2 s `setInterval`,
   **paused when `document.hidden === true`**, and torn down on `pagehide`
   (see `mem://standards/timer-and-observer-teardown`).
6. **Each probe is single-shot fail-fast.** If a probe throws or times out
   (300 ms cap), the row shows `error` with a tooltip carrying
   `Reason+ReasonDetail`. No retry — see `mem://constraints/no-retry-policy`.
7. **Code-Red on probe failure.** A probe that fails writes one Code Red
   row per probe per session (deduped by `(probeName, reason)`).
8. **Empty-state never blank.** If `chrome.runtime` is unavailable
   (Lovable preview, iframe), the panel renders `"Preview mode — chrome.*
   APIs unavailable"` instead of unmounting to a blank div.

## Row data contract

```ts
// src/popup/status/types.ts
export interface StatusSnapshot {
  buildId: string;                                 // from constants.ts
  worker: { state: "alive" | "sleeping" | "error"; reason?: string };
  tab:    { state: "injected" | "not-injected" | "n/a" | "error";
            url?: string; reason?: string };
  errors: { last24h: number };
  heartbeatIso: string;                            // last successful probe time
  devWatcher?: { state: "connected" | "disconnected" };  // dev builds only
}
```

## Reference component

```tsx
// src/popup/components/StatusPanel.tsx
import { useEffect, useState } from "react";
import { BUILD_ID } from "@shared/constants";
import { useStatusSnapshot } from "../status/useStatusSnapshot";
import { VersionBadge } from "./VersionBadge";
import { ReloadButton } from "./ReloadButton";
import { InjectButton } from "./InjectButton";
import { isExtensionPopup } from "../lib/extension-env";

export function StatusPanel() {
  if (!isExtensionPopup()) {
    return (
      <section role="status" className="p-3 text-sm text-muted-foreground">
        Preview mode — <code>chrome.*</code> APIs unavailable.
        Build <code>{BUILD_ID}</code>.
      </section>
    );
  }

  const snap = useStatusSnapshot();   // 2s poll, hidden-tab pause, teardown

  return (
    <section role="status" className="flex flex-col gap-2 p-3 border-b">
      <Row label="Build">           <VersionBadge /></Row>
      <Row label="Service worker">  <Pill tone={tone(snap.worker.state)}>{snap.worker.state}</Pill></Row>
      <Row label="Active tab">      <Pill tone={tone(snap.tab.state)}    title={snap.tab.reason}>{snap.tab.state}</Pill></Row>
      <Row label="Errors (24h)">    <button onClick={openErrorsPanel}>{snap.errors.last24h}</button></Row>
      <Row label="Last heartbeat">  <RelativeTime iso={snap.heartbeatIso} /></Row>
      {snap.devWatcher && (
        <Row label="Dev watcher">   <Pill tone={tone(snap.devWatcher.state)}>{snap.devWatcher.state}</Pill></Row>
      )}
      <footer className="flex gap-2 pt-2 sticky bottom-0 bg-background">
        <ReloadButton source="popup" />
        <InjectButton tabState={snap.tab.state} />
        <a href="#/popup/details" data-testid="open-details">Open Detailed View</a>
      </footer>
    </section>
  );
}
```

## Probe implementations (background)

```ts
// src/background/handlers/status-probe-handler.ts
import { MSG_STATUS_PROBE } from "@shared/messages";
import { isAlreadyInjected } from "../injection/sentinel";
import { isNewTabOrBlankUrl } from "@shared/url-utils";
import { countErrorsSince } from "../errors/error-store";

chrome.runtime.onMessage.addListener((req, _sender, send) => {
  if (req?.kind !== MSG_STATUS_PROBE) { return false; }

  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let tabState: "injected" | "not-injected" | "n/a" | "error" = "n/a";
    let tabReason: string | undefined;
    try {
      if (tab?.id && tab.url && !isNewTabOrBlankUrl(tab.url)) {
        tabState = (await isAlreadyInjected(tab.id)) ? "injected" : "not-injected";
      }
    } catch (caught) {
      const err = caught as CaughtError;
      tabState = "error";
      tabReason = err?.message ?? "probe-threw";
    }

    send({
      worker: { state: "alive" },
      tab:    { state: tabState, url: tab?.url, reason: tabReason },
      errors: { last24h: await countErrorsSince(Date.now() - 86_400_000) },
      heartbeatIso: new Date().toISOString(),
    });
  })();

  return true; // async response
});
```

## Polling hook

```ts
// src/popup/status/useStatusSnapshot.ts
import { useEffect, useState } from "react";
import { MSG_STATUS_PROBE } from "@shared/messages";
import { BUILD_ID } from "@shared/constants";

const POLL_MS = 2_000;
const TIMEOUT_MS = 300;

export function useStatusSnapshot(): StatusSnapshot {
  const [snap, setSnap] = useState<StatusSnapshot>(/* initial */);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      if (document.hidden) { return; }     // pause when not visible
      const reply = await Promise.race([
        chrome.runtime.sendMessage({ kind: MSG_STATUS_PROBE }),
        new Promise<null>((res) => setTimeout(() => res(null), TIMEOUT_MS)),
      ]);
      if (cancelled) { return; }
      if (reply) { setSnap({ ...reply, buildId: BUILD_ID }); }
      else       { setSnap((s) => ({ ...s, worker: { state: "error", reason: "probe-timeout" } })); }
    };

    void tick();
    timer = setInterval(() => { void tick(); }, POLL_MS);
    const onPageHide = () => { if (timer) { clearInterval(timer); timer = null; } };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      cancelled = true;
      if (timer) { clearInterval(timer); }
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return snap;
}
```

## Pitfalls

- **Polling at 100 ms** to "feel responsive" — drains battery and floods the
  SW with `MSG_STATUS_PROBE`. 2 s is the floor; never lower.
- **Never tearing down the interval** — leaks per popup open/close cycle.
  Mandatory cleanup on `pagehide`.
- **Letting `chrome.runtime.sendMessage` hang** without a timeout — the
  popup spins forever when the SW is asleep. 300 ms cap, fall back to
  `worker.state = "error"`.
- **Showing absolute timestamps** instead of relative (`14:23:07` vs
  `3s ago`). Users can't compute drift; relative time is mandatory.
- **Unmounting to blank when `chrome` is missing** — the panel MUST render
  a visible preview-mode placeholder.
- **Forgetting to dedupe Code Red rows from a flapping probe** — one row per
  `(probeName, reason)` per session; otherwise the errors counter
  self-inflates.

## Acceptance

- [ ] Status panel is the first visible element in the popup Home tab.
- [ ] All five required rows render with non-empty values within 300 ms of
      popup open.
- [ ] Build id click copies to clipboard.
- [ ] Errors-row click opens the Errors panel (step 13).
- [ ] Polling pauses when the popup is hidden and tears down on `pagehide`.
- [ ] Probe failure surfaces a tooltip with `Reason+ReasonDetail` and logs
      exactly one Code Red row per `(probeName, reason)`.
- [ ] Dev watcher row is absent from the production build.
- [ ] Preview/no-chrome environment shows the placeholder, not a blank div.

## Tests to ship with this step

- Component: `StatusPanel.test.tsx` — mocks `chrome.runtime.sendMessage`,
  asserts the five rows render, asserts placeholder when `chrome` is
  undefined.
- Hook: `useStatusSnapshot.test.ts` — uses fake timers, asserts pause on
  `document.hidden`, asserts cleanup on `pagehide`, asserts 300 ms timeout
  falls back to `error`.
- Handler: `status-probe-handler.test.ts` — asserts response shape,
  asserts `n/a` on `chrome://newtab/` via `isNewTabOrBlankUrl()`.
- Manual E2E: open popup on a `chrome://newtab/` tab → "Active tab" reads
  `n/a`; switch to a normal URL with injection → reads `injected`.
