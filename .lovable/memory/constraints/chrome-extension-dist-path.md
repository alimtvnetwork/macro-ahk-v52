---
name: chrome-extension dist path
description: Chrome extension build output is chrome-extension/ itself — NOT chrome-extension/dist/. Release/CI scripts must never reference the legacy dist/ subpath.
type: constraint
---
## Rule

The unpacked Chrome extension is built directly into `./chrome-extension/` at
the repo root. There is **no `chrome-extension/dist/` subfolder**.

Authoritative sources:
- `vite.config.extension.ts` → `const DIST_DIR = resolve(__dirname, "chrome-extension")` then `build: { outDir: DIST_DIR }`.
- `powershell.json` → `"distDir": "chrome-extension"`.
- `.gitignore` → `/chrome-extension` (entire folder is build output).

## Root cause of v2.242.0 release-asset regression

`.github/workflows/release.yml` "Package release assets" step referenced
`chrome-extension/dist/...` for:
1. `cp readme.md chrome-extension/dist/readme.md`
2. `echo "${VER}" > chrome-extension/dist/VERSION`
3. `cd chrome-extension/dist && zip -r ../../release-assets/marco-extension-${VER}.zip .`

Because that subfolder does not exist, the `cp` failed under `set -eo pipefail`
and the extension zip was never produced — or, when the earlier steps were
tolerated, the `cd` succeeded into an empty/incidental path and produced an
empty zip. Either way, `marco-extension-{VER}.zip` was missing from the
GitHub Release page.

The legacy `chrome-extension/dist/` path was retired when the unpacked
extension was moved to the repo-root `chrome-extension/` folder (see
`mem://architecture/standalone-scripts/build-and-deployment-flow` and
`spec/03-release-workflow.md`). The workflow was not updated at the same
time.

## How to prevent recurrence

- Any release/CI step that touches the extension build output must use
  `chrome-extension/` (no `/dist` suffix).
- `release.yml` now has:
  - a `Verify chrome-extension build output exists` step that fails fast if
    `chrome-extension/manifest.json` is missing,
  - a post-zip size check that fails the release if
    `marco-extension-{VER}.zip` is missing or `< 10 KiB`.
- The only known remaining `chrome-extension/dist/` reference in the repo is
  `scripts/smoke-test-background.mjs:54` (dev-time smoke test, not release);
  fix it if smoke-test is ever wired into release.

## Fixed in

v2.243.0 (`.github/workflows/release.yml`).
