# 27 — Re-open after destroy: stale MacroController singleton

## Symptom
After the user closes the extension panel (destroy) inside a Lovable project,
re-running the script in the same tab (without a full page refresh) silently
fails to render the controller UI.

## Root cause
`destroyPanel()` (`standalone-scripts/macro-controller/src/ui/ui-updaters.ts`)
removed the DOM marker + container and set `_internal.destroyed=true`, but it
never disposed the `MacroController` singleton.

On re-injection:
1. `runIdempotentCheck()` clears `_internal.destroyed=false` and sees the
   marker gone → returns `proceed`.
2. `macro-looping.ts` calls `MacroController.getInstance()` which returns the
   **old** instance with `_initialized=true`, stale UIManager whose internal
   DOM refs were removed by destroy, and stale loop/credit/auth managers.
3. `installWindowFacade()` calls `mc.markInitialized()` a second time and
   `bootstrap()` runs, but the stale singleton state caused some flows
   (UI re-create, workspace observer) to be skipped or to no-op.

## Fix
`destroyPanel()` now calls `MacroController.getInstance().destroy()` after
removing the DOM. `destroy()` already nulls `_instance` and resets
`_initialized=false`, so the next injection builds a clean singleton.

## Why not also tear down in `runIdempotentCheck`?
Version mismatch path already forces a full re-bootstrap by removing the
marker — the IIFE re-executes from scratch. Only the user-initiated destroy
path was leaving the singleton behind.
