# 48 — New-Tab / Empty-URL Guard Scope

## Context
User request (2026-05-16, KL): _"when we are in the new tab, that means there is no URL. Make sure that nothing runs from this component for now at least."_ — Then asked to update spec, memory, code, bump version, changelog, pin README.

## Ambiguity
1. **"This component"** is not named. The current preview route is `/` (React app shell), but the request semantically maps onto **background injection / matcher** code, because:
   - A React component cannot "run on a new tab" — new-tab pages are `chrome://newtab/` and React UI never mounts there.
   - The extension's **auto-injector** + **project-matcher** + **content-script relay** are the layers that can fire against tab URLs.
2. **What counts as "no URL"** is ambiguous. Candidates:
   - Empty string / `undefined`
   - `about:blank`
   - `chrome://newtab/`, `chrome://new-tab-page/`, `chrome-search://local-ntp/...`
   - `edge://newtab/`, `brave://newtab/`, `opera://startpage/`
   - Any `chrome://*`, `chrome-extension://*`, `devtools://*`, `view-source:*`, `data:*`, `file://*` scheme (browsers block content-script injection here anyway)

## Options

### A. Narrow guard — empty URL + the canonical new-tab URLs only (RECOMMENDED)
Add `isNewTabOrBlankUrl()` returning `true` for: empty/undefined, `about:blank`, and `chrome://newtab/` / `chrome://new-tab-page/` / `chrome-search://local-ntp*` / `edge://newtab/` / `brave://newtab/` / `opera://startpage/`. Call it from `handleNavigationCompleted` + `evaluateUrlMatches` (defense-in-depth) so **no matcher, no resolver, no injector** runs.
- **Pros**: Matches the user's literal phrasing ("new tab... no URL"). Surgical — no behaviour change for any real URL. Fail-safe by default. Easy to extend later.
- **Cons**: Doesn't cover `devtools://`, `view-source:`, `file://`, etc. — but those are already blocked by Chrome's content-script permissions, so functionally fine.

### B. Broad scheme allowlist — only allow `http(s)://`
Reject everything that isn't `http://` or `https://`.
- **Pros**: Strongest. Future-proof against unknown internal schemes.
- **Cons**: Behaviour change — would also block testing pages like `file://` that some workflows rely on. User didn't ask for this scope.

### C. UI-side only — gate `home-screen` React component
Only gate the `src/content-scripts/home-screen/` UI, not the matcher.
- **Pros**: Smallest blast radius.
- **Cons**: Misses the real risk (auto-injector can still wake on `chrome://newtab/` via webNavigation listener). Doesn't satisfy "nothing runs from this component".

## Decision
**Option A.** Adds `isNewTabOrBlankUrl()` to `src/shared/url-utils.ts`, gates both `handleNavigationCompleted` (entry) and `evaluateUrlMatches` (matcher), logs a single info line on skip, returns `[]` for matches. No removal of existing `isProjectPageUrl` guard — this stacks on top of it.

## Side notes (logged, not asked)
- No-Questions Mode counter incremented to **#17** (24 → 23 remaining). User said "let me know" — conversational, not the exit phrase `ask question if any understanding issues`. Window remains active.
- Version bump: 2.249.4 → 2.249.5 across manifest, constants, 6× instruction.ts, macro-controller shared-state.
