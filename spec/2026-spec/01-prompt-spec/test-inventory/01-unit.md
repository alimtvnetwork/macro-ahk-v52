# Unit Test Inventory

Convention: file under `src/**/__tests__/*.test.ts`. IDs are stable; CI greps them.

| ID | Module | Covers |
|---|---|---|
| UT-data-001..010 | `prompt-store` | CRUD, id rules, slug rules, archive, duplicate detection |
| UT-source-001..008 | `prompt-source-parser` | folder, zip, info.json validation, prompt.md parsing, round-trip |
| UT-loader-001..012 | `loader` | success, missing file, invalid schema, variable resolution, cache hit/miss, LRU eviction |
| UT-inject-001..008 | `paste-strategies` | replace, append, prepend, insert-at-cursor, verification ok/fail, cursor restore |
| UT-crud-001..010 | `save-create-edit` | create, edit, delete, duplicate, import, conflict |
| UT-queue-001..010 | `queue-store` | enqueue, dedup, capacity, ordering, status transitions |
| UT-lifecycle-001..010 | `queue-engine` | tick happy, retry, hold, cancel, pause, completion event |
| UT-delay-001..006 | `delay-engine` | default, jitter bounds, skip-first, pause-during-delay, abort |
| UT-fail-001..010 | `failure-router` | every reason code → mandatory schema present |
| UT-settings-001..006 | `settings-store` | schema validate, reset, host override merge |
| UT-obs-001..008 | `event-bus` | event schema conformance, metrics emission |

Target: ≥ 90 % branch coverage on engine/loader/queue modules.

## Acceptance

- [ ] The implementation satisfies the `Unit Test Inventory` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

