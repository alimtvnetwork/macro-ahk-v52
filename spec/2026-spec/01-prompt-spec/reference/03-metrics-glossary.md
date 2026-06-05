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
