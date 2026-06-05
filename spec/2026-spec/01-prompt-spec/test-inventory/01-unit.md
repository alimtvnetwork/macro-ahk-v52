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
