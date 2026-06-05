# Metrics Glossary

| Metric | Type | Description |
|---|---|---|
| `prompt.loaded.count` | counter | Prompts successfully loaded per source open |
| `prompt.load.errors` | counter | Loader errors, tagged by `Reason` |
| `dropdown.open` | counter | Trigger invocations |
| `dropdown.select` | counter | Items inserted, tagged by strategy |
| `paste.success` | counter | Verified pastes |
| `paste.fail` | counter | Verification failures |
| `queue.depth` | gauge | Pending tasks |
| `queue.task.duration_ms` | histogram | start→finish per task |
| `delay.actual_ms` | histogram | Actual delay applied |
| `failure.total` | counter | Failures, tagged by `Reason` |
| `next.submit.detected` | counter | Times submit button resolved |
| `settings.reset` | counter | User-initiated resets |

All metrics MUST be emitted via the event bus per `16-observability/03-metrics.md`.

## Acceptance

- [ ] The implementation satisfies the `Metrics Glossary` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
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

- Implementations MUST honor every numeric default declared in [runtime defaults](05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

