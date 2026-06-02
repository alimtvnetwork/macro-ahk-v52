# Storage Pressure Toast — E-12

Status: Normative · v1.0.0 · 2026-06-02
Surface ID: E-12 (catalogued in ui/14-error-surface-catalog.md)

## Trigger
- `W_STORAGE_PRESSURE` at ≥80% of soft cap (warn toast, dismissible)
- `F_STORAGE_FULL`     at 100% (blocking modal; new macros refused)

Source metric: `storage_used_pct` (observability/11), per layer:
`chrome.storage.local`, `IndexedDB`, `OPFS`, `SQLite`.

## Copy (i18n keys)
| Key | Default text |
|-----|--------------|
| `e12.warn.title` | Storage almost full |
| `e12.warn.body`  | {layer} is at {pct}%. Export and clear old runs to keep recording. |
| `e12.full.title` | Storage full — recording paused |
| `e12.full.body`  | Cannot start new macros until {layer} is below 100%. |
| `e12.action.export` | Export & clear |
| `e12.action.settings` | Open Storage settings |
| `e12.action.dismiss` | Dismiss |

## Behavior
- Singleton (one E-12 at a time per layer; dedupe key = `e12:{layer}`).
- Warn toast auto-dismiss 10s; blocking modal requires user action.
- Both emit `Logger.error()` with Reason + ReasonDetail (namespace logging rule).
- Respects dark-only theme tokens (`--toast-bg`, `--toast-fg`, `--toast-warn`, `--toast-danger`).

## A11y
- `role="alert"` (warn), `role="alertdialog"` (full).
- Focus moves to primary action button; Esc dismisses warn only.
- Contrast ≥ 4.5:1 against dark surface.

## Teardown
Toast component registers/unregisters listeners per timer-and-observer-teardown.

## Tests
- Unit: classifier picks correct copy per pct/layer (testing/10).
- Component: dismiss + action callbacks (testing/11).
- E2E: induce storage pressure via fixture, assert toast then modal (testing/12).
