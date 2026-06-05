# 04 — Debug Panel

**Date:** 2026-06-02
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

## Acceptance

- [ ] The implementation satisfies the `04 — Debug Panel` contract in this file and the folder-level acceptance target: events, metrics, debug panel rows, and diagnostics exports follow the observability schema.
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

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

