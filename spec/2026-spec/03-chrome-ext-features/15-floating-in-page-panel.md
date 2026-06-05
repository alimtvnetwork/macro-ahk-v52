# 15 — Floating In-Page Panel

## Why this step exists

Injected extensions commonly fail after the first visible UI feature because the
floating panel is treated as a throwaway DOM node. That causes duplicate panels,
drag listeners that survive uninject, lost panel position, z-index fights with
the host page, and blank UI after service-worker restart. This step makes the
in-page panel a first-class injected subsystem with one owner, a stable host
element, deterministic teardown, and small persisted UI state.

## Contract

1. **One panel per tab/frame.** The injector creates at most one panel host for
   a given frame. Re-entry must reuse or replace the existing extension-owned
   host, never append a second visible panel.
2. **Injected UI is optional.** Extensions that do not need an in-page control
   may skip this step, but if a floating UI exists it must follow this contract.
3. **Shadow DOM boundary by default.** Render inside a shadow root to isolate
   layout and CSS. Fall back to a light-DOM host only when the target browser or
   test harness cannot attach a shadow root.
4. **Small state only.** Persist panel coordinates, minimized state, and last
   opened tab in `chrome.storage.local`. Do not store logs, scripts, tokens,
   project data, or large payloads here.
5. **Background owns privileged actions.** The panel sends typed messages for
   reload, re-inject, uninject, status, and error rows. Page-side panel code does
   not import storage, SQLite, or privileged managers.
6. **Teardown is mandatory.** Uninject removes the host, style tags, observers,
   event listeners, timers, drag captures, and runtime message subscriptions
   before the sentinel is cleared by step 10.
7. **No retry loops.** Failed panel mount or message calls show typed failure
   state and log Code Red when required. No recursive retry or exponential
   backoff.
8. **Dark-only semantic tokens.** Panel CSS uses extension semantic variables;
   no light mode, theme toggle, raw host-page colors, or one-off gradients.

## DOM ownership

```ts
// src/content/panel/panel-dom.ts
export const FLOATING_PANEL_HOST_ID = "extension-floating-panel-host";
export const FLOATING_PANEL_ATTR = "data-extension-floating-panel";
export const FLOATING_PANEL_BUILD_ATTR = "data-extension-floating-panel-build";

export interface PanelMountResult {
  host: HTMLElement;
  shadowRoot: ShadowRoot | null;
  reused: boolean;
}
```

Rules:

- The host is appended to `document.documentElement`, not `document.body`, so it
  survives hostile page body replacements.
- The host carries `FLOATING_PANEL_ATTR="true"` and
  `FLOATING_PANEL_BUILD_ATTR=<buildId>` for stale-build detection.
- If a host exists with a different build id, step 10 must uninject first, then
  mount the new panel.
- Do not query broad selectors such as `.panel` or `.floating`; use the host id
  and data attributes only.

## Mount algorithm

```ts
// src/content/panel/mount-floating-panel.ts
export function mountFloatingPanel(input: MountPanelInput): MountPanelResult {
  const existing = document.getElementById(FLOATING_PANEL_HOST_ID);
  if (existing != null) {
    const existingBuild = existing.getAttribute(FLOATING_PANEL_BUILD_ATTR);
    if (existingBuild === input.buildId) {
      return { status: "already-mounted", host: existing };
    }
    return {
      status: "stale-build",
      Reason: "FloatingPanelBuildMismatch",
      ReasonDetail: `existing=${existingBuild ?? "null"} current=${input.buildId}`,
    };
  }

  const host = document.createElement("section");
  host.id = FLOATING_PANEL_HOST_ID;
  host.setAttribute(FLOATING_PANEL_ATTR, "true");
  host.setAttribute(FLOATING_PANEL_BUILD_ATTR, input.buildId);
  host.setAttribute("aria-label", "Extension controls");
  document.documentElement.appendChild(host);

  const shadowRoot = host.attachShadow?.({ mode: "open" }) ?? null;
  renderPanelApp(shadowRoot ?? host, input);
  registerPanelTeardown(() => unmountPanelApp(host));
  return { status: "mounted", host };
}
```

The mount function is synchronous for DOM creation and returns a typed result.
Any async status hydration happens after render so the page never blocks.

## Position state

```ts
// src/shared/panel/types.ts
export interface FloatingPanelPosition {
  anchor: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  offsetX: number;
  offsetY: number;
}

export interface FloatingPanelUiState {
  schemaVersion: 1;
  minimized: boolean;
  position: FloatingPanelPosition;
  activeView: "status" | "errors" | "actions";
  updatedAtIso: string;
}
```

Storage key format:

```ts
export const FLOATING_PANEL_STATE_KEY = `${EXTENSION_STORAGE_PREFIX}_floating_panel_state`;
```

Rules:

- State is global per extension by default. Use a per-origin suffix only when the
  product explicitly needs different positions per site.
- Coordinates are clamped to the current viewport on every restore.
- If stored state is invalid, ignore it, log `Reason="FloatingPanelStateInvalid"`,
  and use the default top-right position.
- Do not rename existing `chrome.storage.local` project keys or migrate stored
  object casing as part of this step.

## Drag and minimize behavior

Drag is a pointer-capture interaction on the panel header only.

1. `pointerdown` on the drag handle records pointer id and current rectangle.
2. `setPointerCapture(pointerId)` is called on the handle.
3. `pointermove` updates an in-memory transform and clamps to viewport bounds.
4. `pointerup` or `pointercancel` commits the clamped state to storage once.
5. `Escape` during drag cancels to the pre-drag position.

Minimize / restore:

- Minimized mode renders a square icon button with an accessible label.
- Restored mode renders the full panel at the same anchor and offsets.
- Minimized state is persisted immediately after the user toggles it.
- The minimized button never covers browser chrome; clamp against the viewport.

## Layout and accessibility

- Default size: `320px × auto`, max height `min(560px, calc(100vh - 24px))`.
- Minimum touch target: `40px` for icon buttons and drag handle.
- Header contains version/build text from step 04, truncated with tooltip.
- The Errors view uses step 13 routes and shows unresolved counts only after a
  successful `GET_ERROR_SUMMARY` response.
- All buttons have `type="button"`, focus styles, and `aria-label` when icon-only.
- Keyboard: `Tab` stays within natural DOM order; no focus trap unless a modal is
  opened inside the panel.
- Respect `prefers-reduced-motion`; drag itself remains immediate, decorative
  transitions are disabled.

## Message contract

```ts
export const MSG_PANEL_GET_STATUS = "panel/get-status" as const;
export const MSG_PANEL_RUN_ACTION = "panel/run-action" as const;

export type PanelAction = "reload-extension" | "inject" | "reinject" | "uninject";

export interface PanelRequestBase {
  sourceContext: "floating-panel";
  requestId: string;
  buildId: string;
}

export interface PanelRunActionRequest extends PanelRequestBase {
  kind: typeof MSG_PANEL_RUN_ACTION;
  action: PanelAction;
}
```

Rules:

- Responses echo `requestId` and `buildId`.
- Build mismatch returns `Reason="PanelBuildMismatch"` and asks the panel to
  show stale-state UI; it does not auto-retry.
- Runtime disconnect / extension invalidated is terminal for that page session.
- The panel never calls `chrome.runtime.reload()` directly; it sends the action
  to the background route from steps 05 and 10.

## Teardown hooks

```ts
export interface PanelTeardownResult {
  removedHost: boolean;
  removedStyles: number;
  removedListeners: number;
  cancelledTimers: number;
  Reason: string | null;
  ReasonDetail: string | null;
}
```

The panel registers exactly one teardown callback with the uninject registry.
The callback must:

1. unmount the component tree,
2. remove pointer listeners and release capture if active,
3. clear intervals, timeouts, animation frames, and observers,
4. unsubscribe from runtime messages,
5. remove extension-owned style tags,
6. remove the host element,
7. return the counts above for diagnostics.

If teardown fails, step 10 treats it as `TeardownCallbackFailed` and does not
clear the injection sentinel.

## Code Red logging

Panel errors that touch DOM ownership, storage, or privileged routes must log:

```ts
Logger.error("panel.floating", {
  path: "content://panel/floating-panel-host",
  missing: "single mounted panel host",
  Reason: "FloatingPanelDuplicateHost",
  ReasonDetail: `count=${hostCount}`,
});
```

Required reasons:

| Reason | When |
|---|---|
| `FloatingPanelDuplicateHost` | More than one extension-owned host exists. |
| `FloatingPanelBuildMismatch` | Host exists for a stale build. |
| `FloatingPanelStateInvalid` | Persisted UI state fails validation. |
| `FloatingPanelMountFailed` | Host/shadow root cannot be created. |
| `FloatingPanelTeardownFailed` | Unmount or cleanup throws. |
| `PanelBuildMismatch` | Background response build id differs from panel build id. |

## Pitfalls

- Appending to `body` only — many apps replace `body` children during route
  transitions, orphaning listeners.
- Persisting drag position on every `pointermove` — this burns storage quota and
  can reorder writes. Persist once on drag end.
- Using `localStorage` for panel state — content scripts share page origin and
  service workers cannot read it.
- Calling privileged APIs from page MAIN world — route through the background.
- Clearing the injection sentinel before panel teardown succeeds.
- Creating a draggable card without viewport clamping; it becomes unreachable on
  small screens or after monitor changes.

## Acceptance criteria

- [ ] Mounting twice with the same build returns `already-mounted` and leaves one
      host in the DOM.
- [ ] Mounting with a stale host returns `FloatingPanelBuildMismatch` and does not
      append a second host.
- [ ] Drag end persists one clamped state write; `pointermove` performs zero
      storage writes.
- [ ] Minimize and restore persist and survive extension page reload.
- [ ] Uninject removes host, styles, listeners, timers, and subscriptions; no
      panel DOM remains.
- [ ] A teardown failure blocks sentinel clearing through step 10.
- [ ] Runtime disconnect shows terminal stale-state UI and does not retry.
- [ ] Component tests cover drag clamp, minimize, stale build, invalid storage,
      and teardown counts.
- [ ] Manual Chrome E2E verifies the panel on at least one SPA route change, one
      page reload, and one re-inject cycle.

## Cross-references

- Step 04 — version/build text shown in the panel header.
- Step 07 — status data rendered in the panel.
- Step 10 — uninject owns teardown ordering and stale-build replacement.
- Step 13 — errors summary and rows routes.
- Step 16 — SQLite is background-only; panel must not import DB code.

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

- Implementations MUST honor every numeric default declared in [runtime defaults](../01-prompt-spec/reference/05-runtime-defaults.md); see also [related](readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

