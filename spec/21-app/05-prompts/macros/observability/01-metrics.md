# Observability — Metrics

In-memory counters + histograms maintained by the background runner and persisted to SQLite table `MacroMetrics` on every terminal transition. Read by the Options → Macros audit panel.

## Counters

| Name | Type | Increment trigger |
|------|------|-------------------|
| `macros_run_total` | Counter | every `RunStarted` |
| `macros_finished_total` | Counter | every `RunFinished` (any reason) |
| `macros_failed_total` | Counter | every `RunFailed` |
| `macro_loops_total` | Counter | every `LoopEntered` |
| `macro_steps_total` | Counter | every `StepCompleted` |
| `macro_step_failures_total` | Counter | every `StepFailed` |
| `macro_pauses_total` | Counter | every `RunPaused` |
| `macro_sw_restart_recoveries_total` | Counter | successful rehydration after SW restart |

All counters labeled by `MacroSlug` and terminal `Reason` where applicable.

## Histograms

| Name | Buckets (ms) | Source |
|------|--------------|--------|
| `macro_run_duration_ms` | 1k, 5k, 30k, 60k, 300k, 1.8M, 7.2M | `RunFinished.DurationMs` |
| `macro_step_duration_ms` | 100, 500, 1k, 5k, 30k, 60k, 600k | `StepCompleted.DurationMs` |
| `macro_last_score` | 0, 25, 50, 70, 85, 95, 100 | `ScoreParsed.Score` (last per run) |

## Storage shape (SQLite `MacroMetrics`)
```sql
CREATE TABLE MacroMetrics (
  Id INTEGER PRIMARY KEY AUTOINCREMENT,
  MacroSlug TEXT NOT NULL,
  Name TEXT NOT NULL,
  Labels TEXT NOT NULL,            -- JSON: { Reason?, ... }
  Value REAL NOT NULL,
  BucketUpperBound REAL,           -- NULL for counters
  UpdatedAtKL TEXT NOT NULL
);
CREATE INDEX IX_MacroMetrics_Name_Slug ON MacroMetrics(Name, MacroSlug);
```

## Read surface
- Options → **Macros Audit** panel shows top-N slugs by `macros_run_total`, failure rate, p50/p95 of `macro_run_duration_ms`, and `macro_last_score` distribution.
- Read via `SELECT … FROM MacroMetrics WHERE …`; no external observability stack (no Prometheus, no telemetry — per No-CI-notifications + offline-first posture).

## Reset
- Per-slug reset via Options button → `DELETE FROM MacroMetrics WHERE MacroSlug = ?` with confirm dialog.
- Global reset gated behind type-to-confirm `RESET METRICS`.

## Tests
- `tests/engine/metrics.test.ts` asserts every event increments the right counter with the right labels.
