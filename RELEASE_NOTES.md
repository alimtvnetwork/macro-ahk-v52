# Marco Chrome Extension v3.83.0

## Fixed

- Workspace credit bar no longer collapses to an invisible em-dash while the resolver is fetching. A 160×8px shimmer skeleton bar now paints in the same row slot, and a thin red 2px bar is shown on timeout. Tooltips guide users to click 💰 Credits to refresh / retry. (Plan 01 / Step 6)

## Verification

- `bunx vitest run` — existing credit-resolver suites continue to pass.
- `node scripts/check-version-sync.mjs` — all version files in sync at 3.83.0.
