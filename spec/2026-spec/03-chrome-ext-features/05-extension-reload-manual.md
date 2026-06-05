# 05 — Extension Reload (Manual)

## Why this step exists

When users hit a stuck state (blank popup, stale injected script, after a
config change), the only safe recovery is to reload the extension itself —
not the page, not the tab, the extension. Without a one-click button in the
popup, users are pushed to `chrome://extensions` (which most users do not
even know exists) and we lose them. This step pins the contract for a
visible, idempotent, fail-safe "Reload Extension" orchestration — not just
a button, but the full broadcast / persist / single-attempt flow.

## Scope of this step

This step owns:

1. The canonical `ReloadTriggerSource` union (consumed by step 06 and any
   future trigger).
2. The reload message contract (`MSG_RELOAD_EXTENSION`, `EVT_BEFORE_RELOAD`).
3. The background orchestration handler (broadcast → bounded flush window →
   single `chrome.runtime.reload()` → failure surfacing).
4. The popup control surface and confirmation copy.
5. Mandatory failure-log schema for `Reload.Failed`.

Tab-refresh, dev sockets, port watcher, popup status panel UI, and panel
position persistence are owned by other steps and are referenced only via
extension points defined here.

## Contract

1. **Surface**: every popup MUST expose a "Reload Extension" control. Place
   it in the Status/Health section (see step `07-status-and-health-panel.md`
   *(pending in this folder)*), not buried in a settings page.
2. **Single primitive**: only `chrome.runtime.reload()` is used. No
   workarounds (`chrome.management.setEnabled`, `chrome.tabs.reload`, …)
   unless a separate step explicitly authorizes them.
3. **Confirmation**: a reload destroys the SW, drops all in-flight messages,
   and closes the popup. The user MUST be warned with a non-blocking inline
   confirm — never an alert dialog. Exact copy (locked, do not paraphrase):

   ```text
   Reload extension? Unsaved panel changes will close.
   ```

4. **Pre-reload broadcast**: before calling `chrome.runtime.reload()` the
   background MUST broadcast `EVT_BEFORE_RELOAD` to **every** addressable
   context. "Every context" is defined precisely in §Broadcast fan-out.
5. **Reload audit log (NOT Code Red)**: a `Reload.Requested` row is written
   to the **session log table** (step 16 *(pending)*) before the reload,
   with `triggerSource`, `buildId`, and `acknowledgedContexts[]`. Manual
   reloads are intentional recovery events and MUST NOT inflate the
   unresolved Code Red count surfaced by the Errors panel (step 13).
   `Reason="ManualReload"` rows that pre-date this spec MUST be migrated
   to `severity="info"` / `resolved=true`.
6. **Code Red is reserved for failure**: `Reload.Failed` is the only Code
   Red row this flow may write. It MUST follow the mandatory failure-log
   schema (§Failure log schema).
7. **No-retry**: if `chrome.runtime.reload()` throws (rare; usually means
   the worker is already torn down), log Code Red, broadcast
   `ERROR_COUNT_CHANGED`, surface via the popup error summary. **Never**
   retry — see `mem://constraints/no-retry-policy`. No exponential backoff,
   no scheduled redelivery.
8. **Keyboard shortcut (optional)**: if exposed, default to `Ctrl+Alt+R`
   (Cmd+Alt+R on Mac), declared in `manifest.json#commands`. Shortcut MUST
   be disabled inside editable targets using the same predicate as the
   recorder (`mem://features/recorder-keyboard-shortcuts`), including
   `INPUT`, `TEXTAREA`, `contenteditable="true"`, and shadow-DOM editables.
   Any new `commands` entry MUST also appear in the popup status area and
   in README, audited by `scripts/audit-manifest-commands.mjs`.

## Canonical trigger source (consumed by step 06+)

```ts
// src/shared/messages.ts — single source of truth
export const RELOAD_TRIGGER_SOURCES = [
  "popup",
  "options",
  "panel",
  "keyboard-shortcut",
  "context-menu",
  "file-watch",        // step 06 (dev only)
] as const;
export type ReloadTriggerSource = typeof RELOAD_TRIGGER_SOURCES[number];

export function isReloadTriggerSource(v: unknown): v is ReloadTriggerSource {
  return typeof v === "string"
    && (RELOAD_TRIGGER_SOURCES as readonly string[]).includes(v);
}
```

Later steps MUST import `ReloadTriggerSource`; they MUST NOT redefine it.
A lint rule (`scripts/audit-reload-trigger-source.mjs`) fails if any file
other than `src/shared/messages.ts` declares a string-literal union of
trigger sources.

## Message contract

```ts
export const MSG_RELOAD_EXTENSION   = "ext/reload" as const;
export const EVT_BEFORE_RELOAD      = "ext/before-reload" as const;
export const EVT_BEFORE_RELOAD_ACK  = "ext/before-reload-ack" as const;

export interface ReloadRequest {
  kind: typeof MSG_RELOAD_EXTENSION;
  triggerSource: ReloadTriggerSource;
  buildId: string;            // sender's BUILD_ID — rejected if mismatched
}

export interface ReloadResponse {
  ok: true;
  scheduledReloadAtIso: string;  // SW time when reload() will fire
}

export interface BeforeReloadEvent {
  kind: typeof EVT_BEFORE_RELOAD;
  triggerSource: ReloadTriggerSource;
  deadlineMs: number;           // flush budget remaining
  buildId: string;
}

export interface BeforeReloadAck {
  kind: typeof EVT_BEFORE_RELOAD_ACK;
  contextId: string;            // "popup" | "panel:<tabId>" | "content:<tabId>"
}

export function isReloadRequest(v: unknown): v is ReloadRequest { /* … */ }
```

## Broadcast fan-out (normative)

The background handler MUST address all of:

1. **Extension pages** (popup, options, side panel if any) via
   `chrome.runtime.sendMessage`.
2. **Content scripts and in-page panels**: enumerate via
   `chrome.tabs.query({})`, then for each tab call
   `chrome.tabs.sendMessage(tabId, EVT_BEFORE_RELOAD)` **only if**
   `isInjectableHttpTabUrl(tab.url)` returns true. The predicate MUST
   wrap `isNewTabOrBlankUrl()` (`mem://features/new-tab-no-url-guard`)
   and reject `chrome://`, `chrome-extension://`, `edge://`, `brave://`,
   `opera://`, `chrome-search://`, `about:`, `file://` (unless host
   permission), Web Store URLs, and empty/discarded tabs.

Errors from unreachable tabs MUST be aggregated into a single
`SkippedContexts` summary, **never** one Code Red per tab.

## Best-effort acknowledgement window (no retry)

There is a fixed `FLUSH_DEADLINE_MS = 150` between broadcast and reload.

- The SW collects `EVT_BEFORE_RELOAD_ACK` messages until the deadline.
- At the deadline, the SW writes `Reload.Requested { acknowledgedContexts }`
  and immediately calls `chrome.runtime.reload()`.
- Missing acks are **not** an error; they are recorded as `unacknowledged`
  in the audit row. No retry, no extension of the window.

Wording rule: this is "best-effort flush", not "guaranteed flush".

## Platform messaging adapter (mandatory)

Direct use of `chrome.runtime.sendMessage(...).catch(...)` is **forbidden**:
in MV3, Chrome promisifies these APIs only in recent versions; in older
ones the call returns `undefined` and the `.catch` throws
`Cannot read properties of undefined (reading 'catch')`.

Use the canonical adapter from `src/platform/messaging.ts` (introduced by
step 03):

```ts
sendRuntimeMessageSafe(msg): Promise<SendMessageResult>
sendTabMessageSafe(tabId, msg): Promise<SendMessageResult>
```

Each adapter normalizes callback + Promise APIs, inspects
`chrome.runtime.lastError`, and never throws.

## Reference handler (background)

```ts
// src/background/reload.ts
import {
  MSG_RELOAD_EXTENSION, EVT_BEFORE_RELOAD,
  isReloadRequest, type ReloadResponse,
} from "@shared/messages";
import { Logger } from "@shared/logger";
import { BUILD_ID } from "@shared/constants";
import { sendRuntimeMessageSafe, sendTabMessageSafe } from "@platform/messaging";
import { isInjectableHttpTabUrl } from "@shared/url-utils";
import { toCaughtError } from "@shared/errors";
import { writeSessionAudit, writeCodeRed, broadcastErrorCountChanged } from "@shared/error-store";

const FLUSH_DEADLINE_MS = 150;

export function bindReloadHandler(): void {
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (!isReloadRequest(request)) { return false; }
    if (request.buildId !== BUILD_ID) {
      Logger.warn("Reload.BuildIdMismatch", { received: request.buildId, expected: BUILD_ID });
      sendResponse({ ok: false, reason: "BuildIdMismatch" });
      return false;                       // synchronous: do not keep channel open
    }

    const scheduledReloadAtIso = new Date(Date.now() + FLUSH_DEADLINE_MS).toISOString();
    const response: ReloadResponse = { ok: true, scheduledReloadAtIso };
    sendResponse(response);

    void orchestrate(request.triggerSource);
    return false;                         // response is synchronous
  });
}

async function orchestrate(triggerSource: ReloadTriggerSource): Promise<void> {
  const ackedContexts: string[] = [];
  const skipped: { reason: string; count: number }[] = [];

  const before = { kind: EVT_BEFORE_RELOAD, triggerSource, deadlineMs: FLUSH_DEADLINE_MS, buildId: BUILD_ID };

  // 1. Extension pages
  const ext = await sendRuntimeMessageSafe(before);
  if (ext.ok && ext.replyContextId) { ackedContexts.push(ext.replyContextId); }

  // 2. Tabs
  const tabs = await chrome.tabs.query({});
  let skippedTabs = 0;
  await Promise.all(tabs.map(async (tab) => {
    if (!tab.id || !tab.url || !isInjectableHttpTabUrl(tab.url)) { skippedTabs++; return; }
    const r = await sendTabMessageSafe(tab.id, before);
    if (r.ok && r.replyContextId) { ackedContexts.push(r.replyContextId); }
  }));
  if (skippedTabs > 0) { skipped.push({ reason: "UnsupportedUrl", count: skippedTabs }); }

  // 3. Wait the bounded window (no extension, no retry)
  await new Promise((r) => setTimeout(r, FLUSH_DEADLINE_MS));

  await writeSessionAudit("Reload.Requested", {
    TriggerSource: triggerSource, BuildId: BUILD_ID,
    AcknowledgedContexts: ackedContexts, SkippedContexts: skipped,
  });

  // 4. Single attempt, no retry
  try {
    chrome.runtime.reload();
  } catch (caught) {
    const err = toCaughtError(caught);
    await writeCodeRed({
      EventName: "Reload.Failed",
      BuildId: BUILD_ID,
      Path: "src/background/reload.ts",
      Missing: "chrome.runtime.reload() success",
      Reason: "RuntimeReloadFailed",
      ReasonDetail: err.message ?? "chrome.runtime.reload threw without a message.",
      SelectorAttempts: null,
      VariableContext: null,
    });
    await broadcastErrorCountChanged();
  }
}
```

`bindReloadHandler()` MUST be called synchronously from
`background/index.ts` top level (see step 02).

## Failure log schema (mandatory)

Every `Reload.Failed` row MUST include exactly these top-level fields, in
this casing (project memory: error-logging-requirements, file-path Code Red,
verbose-logging-and-failure-diagnostics):

| Field              | Type                | Required | Notes |
|--------------------|---------------------|----------|-------|
| `EventName`        | string              | yes      | `"Reload.Failed"` |
| `BuildId`          | string              | yes      | `BUILD_ID` |
| `Path`             | string              | yes      | source path that detected failure |
| `Missing`          | string              | yes      | the missing/failed primitive |
| `Reason`           | short code          | yes      | e.g. `"RuntimeReloadFailed"` |
| `ReasonDetail`     | string              | yes      | full caught-error message |
| `SelectorAttempts` | array \| null       | yes      | `null` with implicit reason (n/a for reload) |
| `VariableContext`  | array \| null       | yes      | `null` with implicit reason (n/a for reload) |

Explicit `unknown` is forbidden outside the `toCaughtError(caught)` helper
(`mem://standards/unknown-usage-policy`).

## Pre-reload listeners

Each context that owns ephemeral state subscribes once at startup and
responds via the ack envelope:

```ts
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind !== "ext/before-reload") { return false; }
  persistPanelPosition();                 // step 15 (pending) — see participants below
  flushSessionLogBuffer();                // step 16 (pending)
  sendResponse({ kind: "ext/before-reload-ack", contextId: "panel:" + tabId });
  return false;                            // synchronous response only
});
```

### Extension point for future steps

```ts
export interface BeforeReloadParticipant {
  id: string;                                  // stable, unique
  beforeReload(deadlineMs: number): Promise<void>;
}
export function registerBeforeReloadParticipant(p: BeforeReloadParticipant): void;
```

Steps 15 and 16 *(pending in this folder)* register participants without
changing this handler. Until they ship, the participant registry is empty
and `Reload.Requested` lists `AcknowledgedContexts: []` from in-page panels.

## Reference button (popup)

```tsx
// src/popup/components/ReloadButton.tsx
import { useState } from "react";
import { MSG_RELOAD_EXTENSION, type ReloadTriggerSource } from "@shared/messages";
import { BUILD_ID } from "@shared/constants";
import { getExtensionChrome } from "../lib/extension-env";

export function ReloadButton(props: { source: ReloadTriggerSource }) {
  const [phase, setPhase] = useState<"idle" | "confirm" | "reloading">("idle");
  const ext = getExtensionChrome();
  if (!ext) {
    return <button disabled title="Preview only — chrome.runtime unavailable">Reload Extension</button>;
  }
  const doReload = () => {
    setPhase("reloading");
    void ext.runtime.sendMessage({
      kind: MSG_RELOAD_EXTENSION, triggerSource: props.source, buildId: BUILD_ID,
    });
  };
  if (phase === "confirm") {
    return (
      <div role="alert" className="flex gap-2 items-center">
        <span>Reload extension? Unsaved panel changes will close.</span>
        <button onClick={doReload}>Yes, reload</button>
        <button onClick={() => setPhase("idle")}>Cancel</button>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setPhase("confirm")}
            disabled={phase === "reloading"} data-testid="reload-extension">
      {phase === "reloading" ? "Reloading…" : "Reload Extension"}
    </button>
  );
}
```

## Pitfalls

- **`chrome.runtime.reload()` from the popup.** Skips the broadcast →
  panels lose state. Always route through the background handler.
- **`window.location.reload()` in the popup.** Reloads only the popup
  document, not the extension; SW stays stale.
- **`sendMessage(...).catch(...)` without the platform adapter.** Throws on
  older Chrome MV3 builds where the API is callback-only.
- **`chrome.runtime.sendMessage` only.** Misses content scripts/in-page
  panels — those need `chrome.tabs.sendMessage`.
- **`return true`** from the listener while responding synchronously. Keeps
  the channel open and masks MV3 async-listener bugs.
- **Retrying on failure.** Forbidden by `mem://constraints/no-retry-policy`.
- **Reloading inside SW startup** to "recover" from a boot error → infinite
  loop. The boot-failure banner (step 14) is the correct response.
- **Forgetting editable-field guard** on the shortcut → typing "reload" in
  the recorder nukes the user's work.

## Acceptance

- [ ] Popup renders a visible "Reload Extension" control with the locked
      confirm copy, wired to `MSG_RELOAD_EXTENSION` via the platform adapter.
- [ ] `RELOAD_TRIGGER_SOURCES` is defined once in `src/shared/messages.ts`;
      `scripts/audit-reload-trigger-source.mjs` fails any duplicate union.
- [ ] Background handler validates `isReloadRequest` and `buildId`, replies
      synchronously with `ReloadResponse`, then orchestrates broadcast.
- [ ] Broadcast reaches extension pages AND every tab passing
      `isInjectableHttpTabUrl`; skipped tabs are aggregated, not per-tab-logged.
- [ ] `Reload.Requested` is written to the session audit table with
      `AcknowledgedContexts[]` and `SkippedContexts[]`; it does NOT appear
      in the unresolved Code Red count.
- [ ] On reload failure, exactly one Code Red row is written following the
      mandatory schema, and `ERROR_COUNT_CHANGED` is broadcast.
- [ ] No retry on any failure path (sendMessage, reload, persistence).
- [ ] Keyboard shortcut (if enabled) is ignored in `INPUT`, `TEXTAREA`,
      `contenteditable="true"`, and shadow-DOM editable targets.
- [ ] Lint passes with no explicit `unknown` outside `toCaughtError`.

## Tests to ship with this step

- Unit `reload-handler.test.ts` — fakes `chrome.runtime`, `chrome.tabs`,
  and the platform adapter; asserts:
  - validation rejects `kind` mismatch and `buildId` mismatch;
  - broadcast precedes reload by exactly `FLUSH_DEADLINE_MS`;
  - tab fan-out skips `chrome://newtab/`, `about:blank`, `chrome://`,
    `file://`, Web Store URLs;
  - failure path writes one Code Red row with all mandatory fields and
    triggers `ERROR_COUNT_CHANGED`;
  - no retry occurs on any thrown branch.
- Unit `reload-trigger-source.test.ts` — `isReloadTriggerSource` accepts
  every member of `RELOAD_TRIGGER_SOURCES`, rejects others; static check
  that step 06 imports the union (no duplicate literal).
- Component `ReloadButton.test.tsx` — idle → confirm → reloading
  transitions; disabled in preview (no `chrome`); confirm copy matches
  locked string exactly.
- Static `audit-reload-trigger-source.mjs` — fails if any file other than
  `src/shared/messages.ts` defines a string-literal union of trigger
  sources.
- Manual E2E:
  1. Load unpacked, open popup, click Reload → popup closes, SW restarts.
  2. Open in-page panel, drag, click Reload, reopen → position restored
     (once step 15 lands; until then, audit row shows empty acks).
  3. Type "reload" into a recorder field with shortcut bound → no reload.

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


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
