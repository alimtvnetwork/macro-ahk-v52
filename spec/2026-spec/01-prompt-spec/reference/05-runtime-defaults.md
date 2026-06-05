# Runtime Defaults

Single source of truth for every numeric constant in the spec. Implementation MUST import these from one module (e.g. `src/shared/defaults.ts`) — no inline magic numbers.

| Constant | Default | Range | Source |
|---|---:|---|---|
| `TRIGGER_KEY` | `/` | single char | `05-ui-contract/01-trigger.md` |
| `DELAY_MS` | 7000 | 5000..10000 | `12-delay-engine/01-default.md` |
| `JITTER_MS` | 250 | 0..60000 | `12-delay-engine/03-jitter.md` |
| `JITTER_PERCENT` | 0.2 | 0..1 | `12-delay-engine/03-jitter.md` |
| `SKIP_FIRST_DELAY` | true | bool | `12-delay-engine/04-skip-first.md` |
| `MAX_RETRIES` | 1 | 0..3 | `11-queue-lifecycle/03-retry-and-hold.md` |
| `QUEUE_CAPACITY` | 999 | 1..1000 | `10-queue-model/04-capacity.md` |
| `SUBMIT_GRACE_MS` | 5000 | 0..30000 | `09-next-overview/03-disabled-button-handling.md` |
| `READINESS_GRACE_MS` | 750 | 0..30000 | `09-next-overview/03-disabled-button-handling.md` |
| `PASTE_VERIFY_TIMEOUT_MS` | 250 | 100..5000 | `06-injection-contract/04-paste-verification.md` |
| `TARGET_RESOLVE_TIMEOUT_MS` | 250 | 100..5000 | `06-injection-contract/01-target-resolution.md` |
| `COMPOSITION_END_TIMEOUT_MS` | 2000 | 0..5000 | `06-injection-contract/03-cursor-and-selection.md` |
| `TOAST_DISMISS_MS` | 5000 | 1000..15000 | `06-injection-contract/05-paste-toast.md` |
| `DROPDOWN_MAX_ITEMS` | 50 | 10..200 | `05-ui-contract/02-dropdown-shape.md` |
| `SEARCH_CATALOGUE_LARGE_ITEMS` | 1000 | 1..10000 | `05-ui-contract/03-search-filter.md` |
| `SEARCH_DEBOUNCE_MS` | 120 | 0..1000 | `05-ui-contract/03-search-filter.md` |
| `FRAME_BUDGET_MS` | 16 | 1..50 | `05-ui-contract/03-search-filter.md` |
| `PROMPT_BODY_MAX_BYTES` | 65536 | fixed | `schemas/01-prompt.schema.json` |
| `LOADER_CACHE_LRU_SIZE` | 64 | 16..256 | `04-loader-contract/02-cache-rules.md` |
| `LOADER_CACHE_TOTAL_BYTES` | 6291456 | fixed | `04-loader-contract/02-cache-rules.md` |
| `PLAN_DELAY_MS` | 12000 | 5000..30000 | `14-plan-mode/01-overview.md` |
| `PLAN_IDLE_TIMEOUT_MS` | 180000 | 30000..600000 | `14-plan-mode/03-settings.md` |
| `PLAN_STEP_COUNT` | 10 | 1..50 | `14-plan-mode/03-settings.md` |
| `CI_PROBE_DEPTH` | 20 | 1..100 | `../02-ci-cd-spec-for-chrome-extensions/04-probing.md` |
| `CI_PROBE_PARALLELISM` | 8 | 1..32 | `../02-ci-cd-spec-for-chrome-extensions/04-probing.md` |
| `CI_PROBE_TIMEOUT_MS` | 5000 | 1000..30000 | `../02-ci-cd-spec-for-chrome-extensions/04-probing.md` |
| `FLUSH_DEADLINE_MS` | 150 | 0..1000 | `../03-chrome-ext-features/05-extension-reload-manual.md` |
| `DEBOUNCE_MS` | 250 | 0..1000 | `../03-chrome-ext-features/06-extension-reload-auto-on-file-change.md` |
| `TTL_MS` | 5000 | 0..30000 | `../03-chrome-ext-features/06-extension-reload-auto-on-file-change.md` |
| `TIMEOUT_MS` | 300 | 0..5000 | `../03-chrome-ext-features/07-status-and-health-panel.md` |
| `ACK_TIMEOUT_MS` | 500 | 0..5000 | `../03-chrome-ext-features/10-reinject-and-uninject.md` |
| `ERROR_PANEL_LIMIT` | 500 | 1..500 | `../03-chrome-ext-features/13-error-routing-and-panel.md` |
| `LOG_TRUNCATE_HTML` | 120 | when verbose=false | `mem://standards/verbose-logging-and-failure-diagnostics` |
| `LOG_TRUNCATE_TEXT` | 240 | when verbose=false | same |
| `CHROME_STORAGE_LOCAL_PER_KEY_BYTES` | 8192 | fixed | `../03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` |
| `CHROME_STORAGE_LOCAL_TOTAL_BYTES` | 10485760 | fixed | `../03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` |
| `CHROME_STORAGE_SAFE_PER_KEY_BYTES` | 8192 | fixed | `../03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` |
| `CHROME_STORAGE_DEFAULT_QUOTA_BYTES` | 10485760 | fixed | `../03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` |
| `MAX_SCRIPT_SIZE_BYTES` | 5242880 | fixed | `../03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` |
| `MAX_CONFIG_SIZE_BYTES` | 1048576 | fixed | `../03-db-and-sqlite-integration-with-chrome-extension/26-chrome-storage-local-quota.md` |
| `FLUSH_DEBOUNCE_MS` | 5000 | 0..30000 | `../03-db-and-sqlite-integration-with-chrome-extension/18-flush-strategy.md` |
| `SW_IDLE_MS` | 30000 | browser-defined | `../03-db-and-sqlite-integration-with-chrome-extension/18-flush-strategy.md` |

## Acceptance

- [ ] The implementation satisfies the `Runtime Defaults` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind every numeric default (timeouts, capacities, retries=0, debounce/throttle ms, char limits) to a named constant in `reference/05-runtime-defaults.md`. Inline literals are rejected by `check-must-constants.mjs`.
- **MUST** classify every failure with a stable `Reason` (see `reference/02-failure-reason-codes.md`) plus `ReasonDetail`, and log via `Logger.error` — never `console.error`, never silent `catch {}`.
- **MUST** include `SelectorAttempts[]` on every selector miss and `VariableContext[]` on every variable/data failure; unknown fields written as `null` with a reason.
- **MUST** render timestamps in the user-local timezone (`Intl.DateTimeFormat().resolvedOptions().timeZone`); storage is UTC ms only.

## Pitfalls / Counter-examples

- ❌ Empty `catch (e) {}` — rejected by `public/error-swallow-audit.json`. ✅ `Logger.error` + re-throw.
- ❌ Retrying a failed call with exponential backoff. ✅ Fail fast per `mem://constraints/no-retry-policy`.
- ❌ Hardcoded `Asia/Kuala_Lumpur` (or any zone). ✅ User-local timezone at render time.
- ❌ `setInterval` / `setTimeout` without paired teardown. ✅ Register `pagehide` cleanup (see `mem://standards/timer-and-observer-teardown`).
- ❌ Magic numbers (`1500`, `64`) inline. ✅ Import the named constant from `reference/05-runtime-defaults.md`.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
