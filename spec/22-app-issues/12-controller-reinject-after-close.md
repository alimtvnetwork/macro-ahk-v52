# Controller Re-Injection After Close

**Version landed:** v3.60.0
**Owner file:** `standalone-scripts/macro-controller/src/ui/ui-updaters.ts` (`destroyPanel`)
**Related memory:** `mem://features/macro-controller/close-then-reinject`

## Bug

After the user clicks the close (✕) button on the macro-controller panel and
then re-injects via the extension popup, the loading toast appears but the
panel never reappears.

## Root cause

`destroyPanel()` was only tearing down the marker + main container. It left
behind:

| Stale state | Why it broke re-inject |
| --- | --- |
| `#${IDS.RECORD_INDICATOR}` (record dot) | `createRecordIndicator()` bails when the id already exists |
| `#marco-repeat-inline` (inline strip)   | `mountRepeatInlineStrip()` bails when the id already exists |
| `window.__marcoRouteGuardInstalled = true` | `installSpaRouteGuard()` returns a no-op when the flag is `true` |
| `domCache` entries pointing at detached DOM | `createUI()` reused a stale XPath result and appended the panel into an orphaned subtree (invisible) |
| `_internal.createUIWrapper` / `createUIManager` factories from the first IIFE | `ensureUiManagerRegistered()` self-heal could resurrect them before the new IIFE overwrote them |

## Fix (v3.60.0)

`destroyPanel()` additionally:

```ts
document.getElementById(IDS.RECORD_INDICATOR)?.remove();
document.getElementById('marco-repeat-inline')?.remove();
window.__marcoRouteGuardInstalled = false;
domCache.invalidate();
nsWrite('_internal.createUIWrapper', undefined);
nsWrite('_internal.createUIManager', undefined);
```

## Contract

**After `destroyPanel()` returns, the page MUST be indistinguishable from a
never-injected page** (apart from `_internal.destroyed`, which the next IIFE
clears in `runIdempotentCheck()`).

Any future feature that installs a process-wide guard — window flag, namespace
factory, or DOM sentinel with an id-based idempotency check — MUST also be
reset inside `destroyPanel()`. Add to the table above and to the regression
test.

## Acceptance

1. Inject the controller — panel appears.
2. Click ✕ — panel disappears, toast confirms teardown.
3. Re-inject from the extension popup — panel reappears within 5s and is
   reachable via `document.contains(document.getElementById(IDS.CONTAINER))`.
