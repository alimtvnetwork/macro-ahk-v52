# 04 — Debug Panel

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T99

## Surface

Hidden by default. Opens via Settings → Debugging → "Open debug panel" (only enabled when `debug.exposeFailureDrawer` is true).

## Tabs

1. **Live queue** — current tasks with status pills and a force-refresh button.
2. **Recent events** — last 200 `ObservabilityEvent`s in a virtual list; filterable by `kind`.
3. **Metrics** — `MetricsSnapshot` cards (completion rate, failure mix, latency percentiles).
4. **Failures** — table of recent `failed` tasks; click a row to open the full `FailureRecord` drawer.
5. **Export** — download the last 7 days of events as a human-readable ZIP (matches the project's Log Diagnostics Export format).

## Verbose gate

Without verbose logging, bodies and HTML snippets show truncated to 120/240 chars (Core memory). With verbose on, the drawer shows full content and adds a "Copy" button per field.

## Performance

- Recent events list uses windowed rendering (50 rows visible).
- Metrics are computed on tab open and cached for 30s — explicit refresh button to bypass.
- Panel registers no global listeners outside its lifetime; teardown follows the Timer & Observer Teardown rule.
