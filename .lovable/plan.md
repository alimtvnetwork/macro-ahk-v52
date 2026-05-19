# Plan — Dashboard scripts "not available" + auto-attach by URL condition

## What the user is seeing

On the Options → Project Detail → **Scripts** tab, scripts that exist in the library appear in a "not available" state — rows render but cannot be picked or edited, and the user has to attach them by hand. The user wants scripts to be connected to projects automatically based on the URL-match condition that already exists in each script's `instruction.json`. They also want **no error swallowing** along the way.

## Hypothesis (root cause)

Two independent bugs combine into the "not available" symptom:

1. **Silent binding miss.** `ScriptsTabContent.findScript(path)` in `src/components/options/ProjectDetailView.tsx` falls back to `{scriptId: s.path, code: ""}` when a saved project script no longer matches any `StoredScript.name`. The row renders empty, the user has no way to repair it, and nothing is logged.
2. **No auto-attach.** Creating or saving a project never compares the project's URL to each script's `UrlMatches`. So even though every script declares the URL it belongs to, the project starts empty and the user must wire each one manually.

We will confirm both before writing fix code by adding **diagnostic-only** logging first.

## Scope

In scope:

- Options → Project Detail → **Scripts** tab (`ProjectDetailView.tsx`, `ProjectScriptSelector.tsx`)
- Save path: `SAVE_PROJECT` handler in `src/background/handlers/`
- Script library loader: `GET_ALL_SCRIPTS` + `script-resolver.ts`

Out of scope (no behavior change this round):

- Popup, content scripts, recorder, webhook delivery
- Standalone macro-controller UI

## Phases

### Phase 1 — Diagnose (no behavior change, ~30 min)

1. Replace the silent `findScript` fallback with a `Logger.error` call that records `{ projectId, savedPath, libraryNames }`. Render an explicit `UnboundScript` row in the UI (red badge + "Re-link" button) instead of an empty row.
2. Add a one-shot console group on `ProjectDetailView` mount logging `{ availableScripts: name[], project.scripts: path[], matched: count, unbound: name[] }`.
3. Ship a `node scripts/audit-project-script-bindings.mjs` one-off that reads `chrome.storage` export bundles in `/dev-server/.lovable/diagnostics/*.zip` (if present) and prints the mismatch table.

**Exit criteria:** the user reloads, reports the unbound list from the console group, and we know whether the failure is name-mismatch (rename / migration) or library-empty (loader bug).

### Phase 2 — Fix bindings + auto-attach (~1 hour)

Based on Phase-1 evidence, apply whichever subset is needed:

- **Heal mismatched bindings on save** — when `findScript` resolves a basename or `endsWith` match, rewrite `s.path` to the canonical `StoredScript.name` so the next save no longer drifts.
- **Auto-attach on save** — `attachScriptsByUrl(project, library)` reads each script's `instruction.UrlMatches` (already in `availableScripts` via `script-resolver`), tests against `project.url`, and appends any unattached match in stable `order`. Skip scripts the user has explicitly removed (track in `project.scripts.removedAutoAttach: string[]`).
- **Auto-attach on first load** for legacy projects with `project.scripts.length === 0` and no `removedAutoAttach` flag yet.

A small toast in the Scripts tab will tell the user **"Auto-attached N scripts matching this project's URL"** with an Undo action that writes those names into `removedAutoAttach`.

### Phase 3 — No error swallowing pass (~20 min)

1. Audit the touched files for `catch {…}` blocks; route every one through `Logger.error` or rethrow.
2. Re-run `node scripts/audit-error-swallow.mjs` to confirm zero new findings on changed files.
3. Re-run typecheck and the affected vitest suites (`ProjectDetailView`, `ProjectScriptSelector`).

## Technical details

- **No new dependencies.** Reuses `Logger`, `script-resolver`, `useProjectsScripts` hook.
- **Storage shape stays the same** — `project.scripts: { path; order; runAt; configBinding?; code? }[]`. We only add the optional sibling `project.removedAutoAttach?: string[]`. No PascalCase rewrite (forbidden by memory).
- **Migration**: backfill is a no-op when `project.scripts.length > 0` — the auto-attach only fills empty projects, so existing wiring is never overwritten.
- **Versioning**: minor bump after Phase 2 lands, synced via `scripts/check-version-sync.mjs`.

## Risks

- Auto-attaching scripts the user did not want — mitigated by the `removedAutoAttach` undo list and the toast.
- URL pattern in `instruction.UrlMatches` is a MV3 match pattern (`https://*.example.com/*`), not a regex — we will use the existing matcher from `auto-injector.ts` so semantics stay identical to runtime injection.
- Renaming `s.path` on save changes the saved bundle shape for users who export — acceptable because the new name is the canonical library name.

## What this plan deliberately does NOT do

- Does not change the popup or the macro-controller workspace UI.
- Does not change auto-injection runtime behavior — only the **attachment** that feeds it.
- Does not introduce any new error-swallow patterns.
