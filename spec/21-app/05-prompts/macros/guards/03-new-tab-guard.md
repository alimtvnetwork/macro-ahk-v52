# Guard — New-Tab Refusal

Re-statement of the Core memory rule (`mem://features/new-tab-no-url-guard`), scoped to Macros.

## Rule
Macros MUST refuse to run when the target tab's URL satisfies `isNewTabOrBlankUrl()` (from `src/shared/url-utils.ts`).

## Covered URLs
- `about:blank`
- `chrome://newtab/`
- `chrome://new-tab-page/`
- `chrome-search://local-ntp*`
- `edge://newtab/`
- `brave://newtab/`
- `opera://startpage/`
- Empty string / `undefined` URL

## Enforcement points

| Point | Behavior |
|-------|----------|
| **StartMacro** dispatch | Background checks active tab URL; refuses with `Reason='NewTabGuard'` + UI banner "Open a normal page to run macros". |
| **Per-step ExecStep** dispatch | Re-checked before each step (tab may have navigated). Refusal → `RunFailed Reason='NewTabGuard'`. |
| **SW-restart rehydration** | Active runs whose tab is now a new-tab URL → `RunFailed Reason='NewTabGuard'` (see `engine/02-resume-after-sw-restart.md`). |

## Single helper
- All checks call `isNewTabOrBlankUrl(url)` — no inline regex duplication.
- Adding a new browser's new-tab URL is a **single-file** change in `url-utils.ts`.

## UI surface
- Prompts button data-state becomes `disabled-new-tab` (greyed; tooltip: "Macros don't run on new-tab pages").
- Variable Input Dialog disabled with same tooltip if URL changes mid-fill.

## Failure log
`Reason='NewTabGuard'`, `ReasonDetail = "tabUrl=<url>, runId=<id>"`. Always include the offending URL verbatim (it is not sensitive).

## Tests
- Unit: `tests/engine/new-tab-guard.test.ts` covers each URL in the helper's deny list.
- E2E: `tests/e2e/prompts/new-tab-guard.spec.ts` (scenario 8 in `testing/02-e2e-tests.md`).
