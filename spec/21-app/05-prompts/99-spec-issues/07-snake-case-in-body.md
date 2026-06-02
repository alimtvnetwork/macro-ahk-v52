# C7 — snake_case Identifiers in Body Content

**Version:** 0.1.0
**Updated:** 2026-06-02
**Severity:** Medium
**Unique tokens found:** 20

---

## Rule potentially violated

Project convention (`mem://architecture/constant-naming-convention`) says identifiers are SCREAMING_SNAKE_CASE for constants and PascalCase elsewhere. The spec body uses `snake_case` in 20 unique tokens — needs a ruling: **keep Prometheus convention or rewrite**.

## Evidence (sample, 15 / 20)

```
all_urls                       → quoted Chrome manifest term, OK to keep
host_permissions               → quoted Chrome manifest term, OK to keep
audit_spec                     → prompt slug, OK (slugs allow snake)
app__________                  → ⚠ stray placeholder, looks like artefact
checksums__                    → ⚠ stray placeholder
macro_last_score               → Prometheus metric (observability/01)
macro_loops_total              → Prometheus metric
macro_pauses_total             → Prometheus metric
macro_run_duration_ms          → Prometheus metric
macro_step_duration_ms         → Prometheus metric
macro_step_failures_total      → Prometheus metric
macro_steps_total              → Prometheus metric
macro_sw_restart_recoveries_total → Prometheus metric
macros_failed_total            → Prometheus metric
macros_finished_total          → Prometheus metric
```

### Two distinct sub-issues

| Sub | Description | Action when fixing |
|----:|-------------|--------------------|
| C7a | Stray `__________` placeholders (`app__________`, `checksums__`) — likely leftover markdown table rendering bugs | Rewrite to clean identifiers |
| C7b | Prometheus metric names — `snake_case` is **the** convention for Prometheus; renaming would violate that ecosystem | Add explicit exception note in `observability/01-metrics.md` referencing Prometheus naming rules |

## Why a blind AI fails

Without an exception note, a blind AI applying the project's PascalCase rule will rename the metrics, breaking dashboards/queries.

## Atomic sub-tasks

C7a → 1 grep-and-fix task. C7b → 1 documentation-exception task.
