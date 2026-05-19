# 20 — Dashboard "scripts not available" + auto-attach by condition

**Reported:** user message — "on the dashboard, there is a dashboard script that is not available. There are many projects we have created. The scripts are there, but [in the] 'not available' section, and also I cannot select them. So all these scripts should be connected with projects… and run based on the condition we have discussed. It is not doing it. So by default it should do it. Make sure there is no error swallowing."

## What is observable in code

- The Options-page Project Detail → **Scripts tab** uses `ProjectScriptSelector` (`src/components/options/ProjectScriptSelector.tsx`).
- Available scripts come from `GET_ALL_SCRIPTS` (`src/components/options/ProjectDetailView.tsx` → `availableScripts: StoredScript[]`).
- Matching is by `script.name === entry.path` with basename fallback (`findScript` at L1591). When no match: `scriptId` falls back to `s.path` and `code` falls back to `""` — the row still renders but appears empty.
- "Available scripts" picker is gated on `availableScripts.length > 0` (L449). If the library returns `[]`, the "From Library" button vanishes — UI looks like "no selectable scripts".
- There is no auto-attach-by-condition step anywhere in the project save flow. Auto-injection runs at navigation time via `src/background/auto-injector.ts`, but it only reads `project.scripts` — it does not populate that array.

## Ambiguities (cannot resolve without the user)

| # | Question | Options |
|---|----------|---------|
| A | **Which "dashboard"** is the user looking at? | (a) Options → Projects → Detail → **Scripts tab** (most likely); (b) Popup → scripts list; (c) the floating macro-controller workspace UI |
| B | **What does "not available section" mean visually?** | (a) The "From Library" picker is empty/hidden because `availableScripts.length === 0`; (b) bound rows show with empty code because `findScript()` returned undefined (name/path mismatch); (c) a literal "Not Available" label exists in a screen we haven't located |
| C | **"All scripts should be connected with projects by default"** — which connection? | (a) When a new project is created, auto-attach every script in the library; (b) auto-attach scripts whose `instruction.AutoAttach` (or URL match) matches the project's URL; (c) only auto-attach the canonical built-ins (macro-controller, payment-banner-hider, etc.) |
| D | **"Run based on the condition we discussed"** — which condition? | (a) Project URL match (`project.url` + `urlPattern` from instruction); (b) script's own `urlMatches` from MV3 manifest; (c) custom per-project predicate set in Settings |

## Recommendation (default if no answer)

**A=(a), B=(b), C=(b), D=(a).** Most likely root cause: project scripts saved with a path string that no longer matches any `StoredScript.name` (e.g. legacy `projects/scripts/<folder>/<file>` paths vs new flat library names). Fix:

1. **RCA pass** — instrument `findScript()` to `Logger.error` (not swallow) when a saved binding misses, dumping `{path, available: availableScripts.map(s=>s.name)}` to make the mismatch visible in diagnostics.
2. **Auto-attach by URL** — on project save (or first load), iterate `availableScripts`, read each script's `instruction.json` (already cached via `script-resolver.ts`), and append any script whose `UrlMatches` matches `project.url` and is not already in `project.scripts`.
3. **No silent fallback** — replace `findScript()` returning `undefined` → empty code with an explicit `UnboundScript` marker that renders as a red "Script library missing: '<path>'" row with a "Re-pick from library" action.

### Pros / Cons

- **Pros**: makes the broken binding visible instead of silently rendering an empty row; honors the "no error swallowing" Core rule; auto-attach removes the manual step the user is complaining about.
- **Cons**: auto-attach could surprise users who deliberately removed a script (mitigate with a one-time "do not auto-attach" flag per project); requires a small migration to backfill existing projects.

### Alternatives considered

- **Manual-only fix** (just expose a clearer "no scripts available" empty state) — rejected: user explicitly said "by default it should do it".
- **Attach every library script unconditionally** — rejected: noisy, would run scripts on URLs they aren't designed for.

## Action

Plan written to `.lovable/plan.md` and surfaced via `plan--show`. Will not start coding until the user approves the plan or selects a different option above.
