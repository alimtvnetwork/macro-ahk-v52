# Performance Budgets — Prompt Macros

Status: Normative · v1.0.0 · 2026-06-02

| Metric | Budget | Hard ceiling | Measured by |
|--------|--------|--------------|-------------|
| Cold start (runner ready) | ≤ 250 ms | 500 ms | perf mark `macro.runner.ready` |
| Interpolate 1 variable | ≤ 1 ms | 5 ms | observability/11 `interp_ms` |
| Single step dispatch | ≤ 50 ms | 200 ms | `step_dispatch_ms` |
| Audit write (avg) | ≤ 10 ms | 50 ms | `audit_write_ms` |
| Watchdog tick overhead | ≤ 2 ms/s | 5 ms/s | `wd_overhead_ms` |
| Memory (run state) | ≤ 2 MB | 8 MB | `runstate_bytes` |
| Storage write/run | ≤ 64 KB | 256 KB | audit JSON size |

## Regression policy
- CI gate `perf-budget` (testing/14) fails if any metric > hard ceiling on synthetic fixture.
- Soft-budget breach logged as `PERF_WARN` reason code (observability/12).

## Profiling
Use `performance.mark` / `measure` with prefix `macro.*`; export via `chrome.runtime.sendMessage({type:'MACRO_PERF_DUMP'})`.
