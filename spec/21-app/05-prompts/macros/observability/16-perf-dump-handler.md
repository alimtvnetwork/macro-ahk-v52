# MACRO_PERF_DUMP — Message Handler Spec

Status: Normative · v1.0.0 · 2026-06-02
Owner: macro-runtime + platform

## Purpose
Expose runtime performance marks (set by engine + interpolator + watchdog)
to the UI / diagnostics export, without off-device telemetry.

## Message contract
Request (UI → background SW):
```ts
{ type: 'MACRO_PERF_DUMP', runId?: string }
```
Response:
```ts
{
  ok: true,
  runId: string | null,
  marks: Array<{ name: string; startTime: number; duration?: number }>,
  metrics: {
    interp_ms_p50: number; interp_ms_p95: number;
    step_dispatch_ms_p50: number; step_dispatch_ms_p95: number;
    audit_write_ms_avg: number;
    runstate_bytes: number;
    storage_used_pct: Record<'chromeLocal'|'idb'|'opfs'|'sqlite', number>;
  },
  budgets: { name: string; ceiling: number; actual: number; pass: boolean }[]
}
```

## Source
- `performance.getEntriesByType('mark' | 'measure')` filtered by prefix `macro.*`.
- Per-run buffer (capped at 1000 marks; FIFO eviction).

## Behavior
- No-retry (fail-fast). On unknown `runId` → `{ ok: false, reason: 'UNKNOWN_RUN' }`.
- Honors Code Red logging: missing buffer logs exact runId + reason via `RiseupAsiaMacroExt.Logger.error()`.
- Read-only: never mutates run state.
- Returns budgets table mirroring performance/10 so UI can flag W_PERF_BUDGET inline.

## Privacy
- No payload contents. Only timing + size metrics.
- Storage % is aggregate, not per-key.

## Tests
- Unit: filter + percentile math (testing/10).
- Component: UI renders budgets table; flags soft-budget breach (testing/11).
- E2E: dump after real run on fixture macro (testing/12).
