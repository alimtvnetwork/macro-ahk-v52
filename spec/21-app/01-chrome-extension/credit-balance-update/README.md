# Credit Balance Update — Spec Index

20-file spec for the Lite (`Ktlo`) / Free / Cancelled credit-balance flow.

| # | File                                  | Topic                                  |
|---|---------------------------------------|----------------------------------------|
| 01 | `01-overview.md`                     | Problem, goal, non-goals, acceptance   |
| 02 | `02-trigger-logic.md`                | When `/credit-balance` is called       |
| 03 | `03-enums.md`                        | `Plan`, `GrantType`, `CreditFetchOutcome` |
| 04 | `04-data-types.md`                   | `WorkspaceInfo`, `CreditBalance`, …    |
| 05 | `05-api-contract.md`                 | Endpoint, headers, response, errors    |
| 06 | `06-settings-slider.md`              | `creditFetchDelayMs` slider            |
| 07 | `07-ui-display.md`                   | Row cell, tooltip, modal updates       |
| 08 | `08-module-layout.md`                | Files + reuse rules                    |
| 09 | `09-timeout-cancellation.md`         | `AbortController` budget               |
| 10 | `10-caching-single-flight.md`        | In-mem + IDB cache + single-flight     |
| 11 | `11-logging.md`                      | Mandatory failure-log schema           |
| 12 | `12-auth.md`                         | `getBearerToken()` + single retry      |
| 13 | `13-state-machine.md`                | Idle → Resolve → Cache → Fetching → Terminal |
| 14 | `14-settings-bus.md`                 | `SAVE_SETTINGS` / `GET_SETTINGS`       |
| 15 | `15-filesystem-surfaces.md`          | Keys, paths, DBs, log namespaces       |
| 16 | `16-tests-unit.md`                   | Function-level Vitest plan             |
| 17 | `17-tests-integration.md`            | Component/JSDOM plan                   |
| 18 | `18-tests-e2e.md`                    | Playwright plan                        |
| 19 | `19-acceptance-matrix.md`            | Requirement → test mapping             |
| 20 | `20-risk-rollout-version.md`         | Risk, flag, version bump checklist     |

**Plan tracker:** root `plan.md` → "Credit Balance Update — 60-Step Plan".
