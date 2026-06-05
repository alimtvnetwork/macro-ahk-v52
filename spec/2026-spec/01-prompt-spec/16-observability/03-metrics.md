# 03 — Metrics & Aggregations

**Date:** 2026-06-02
**Task:** T98

## Local rollups (computed on demand from event log)

| Metric | Formula | Window |
|--------|---------|--------|
| `task.completionRate` | completed / (completed + failed) | last 24h |
| `task.holdRate` | held / total | last 24h |
| `task.failureMix` | count by `reason` | last 7d |
| `task.latencyP50/P95` | percentiles of `durationMs` | last 24h, per kind |
| `prompt.usage` | enqueued count by `promptSlug` | last 30d |
| `queue.throughput` | tasks/min during active drains | last 24h |

## Computation

A pure function `computeMetrics(events: ObservabilityEvent[], windowMs: number): MetricsSnapshot`. No background workers — computed when the debug panel opens or on explicit "Refresh metrics".

## SQLite indexing

The session log already indexes by `at`; an additional index on `(kind, at)` keeps rollups under 50ms for a week of events.

## Privacy

Rollups expose only counts and durations. The raw event log is local-only and respects the 7-day prune.

## Acceptance

- [ ] The implementation satisfies the `03 — Metrics & Aggregations` contract in this file and the folder-level acceptance target: events, metrics, debug panel rows, and diagnostics exports follow the observability schema.
- [ ] Verification passes when `UT-obs-001..008` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** emit every observability event with the schema in `02-event-schema.md` — `{ ts: number, scope: string, level: "info"|"warn"|"error", reason?: string, payload?: JsonValue }`.
- **MUST** keep metrics names in `03-metrics.md` lowercase snake_case; new metrics require a PR to the metrics glossary.
- **MUST** expose the debug panel only when `Settings.verboseLogging=true`; default OFF (see `mem://features/verbose-logging-toggle`).
- **MUST** export diagnostics as a ZIP per `05-export-diagnostics.md`; no raw text dumps.

## Pitfalls / Counter-examples

- ❌ Free-text scope strings ("ui", "thing"). ✅ Use the canonical `feature.subfeature` namespace.
- ❌ Logging PII without masking. ✅ Sensitive fields auto-masked unless verbose-logging is ON.
- ❌ Sending events to a remote endpoint. ✅ Local-only — never `mem://constraints/no-ci-notifications`.
- ❌ Hardcoded timestamp formatting. ✅ Store UTC ms; render with `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- ❌ Retrying failed metric writes. ✅ Drop on floor with a single `Logger.warn` (fail-fast).

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

