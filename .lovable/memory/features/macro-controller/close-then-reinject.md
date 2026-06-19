---
name: Close → Re-inject Bug (v3.60.0)
description: When the controller is closed via the X button and then re-injected, the panel must rebuild — destroyPanel must wipe ALL stale state, not just marker+container
type: feature
---
# Controller Re-Injection After Close (v3.60.0)

## Symptom
1. User clicks the close (✕) button on the macro-controller panel.
2. User re-injects via extension popup "Run script".
3. The startup toast appears, but the panel itself never rebuilds.

## Root cause
`destroyPanel()` in `standalone-scripts/macro-controller/src/ui/ui-updaters.ts`
removed only the marker + main container. Several pieces of stale state
survived in the page and silently sabotaged the next bootstrap:

1. **Record indicator** (`IDS.RECORD_INDICATOR`, fixed-position) — left behind.
   `createRecordIndicator()` has an idempotency guard that bails when the id
   already exists, so on re-inject we kept a stale floating dot AND skipped
   the rebuild path.
2. **Inline repeat strip** (`#marco-repeat-inline`) — `mountRepeatInlineStrip()`
   is also idempotent on id, so it never reattached.
3. **`window.__marcoRouteGuardInstalled`** — set to `true` on first install.
   `installSpaRouteGuard()` returns a no-op teardown when the flag is `true`,
   so the SPA route guard never re-installed after re-inject.
4. **`domCache`** — held cached XPath lookups pointing at detached DOM nodes
   from the first injection. `createUI()` calls `getByXPath(CONFIG.CONTROLS_XPATH)`
   first; if the cache returned a node that was no longer in the document,
   the panel was appended into a detached subtree and rendered invisible.
5. **`_internal.createUIWrapper` / `_internal.createUIManager`** factories
   from the FIRST IIFE were still in the namespace, capturing dead module
   state. The `ensureUiManagerRegistered()` self-heal path could resurrect
   the OLD wrapper before the new IIFE's `nsWrite` overwrote it.

## Fix
`destroyPanel()` now also:
- removes `#${IDS.RECORD_INDICATOR}` and `#marco-repeat-inline`
- sets `window.__marcoRouteGuardInstalled = false`
- calls `domCache.invalidate()`
- writes `undefined` to `_internal.createUIWrapper` and `_internal.createUIManager`

## Rule for future contributors
Anything that installs a process-wide guard (window flag, namespace factory,
DOM sentinel with an id-based idempotency check) MUST also be reset inside
`destroyPanel()`. The contract is: **after destroyPanel, the page must be
indistinguishable from a never-injected page** apart from `_internal.destroyed`
which the next IIFE clears in `runIdempotentCheck()`.

## Regression test
A future test should:
1. Run the IIFE.
2. Call `destroyPanel()`.
3. Re-run the IIFE.
4. Assert `document.getElementById(IDS.CONTAINER)` is truthy within 5s and
   the container is reachable from `document.body` (`document.contains(...)`).
