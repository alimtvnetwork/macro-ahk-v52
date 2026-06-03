# 03 — Metrics & Aggregations

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
