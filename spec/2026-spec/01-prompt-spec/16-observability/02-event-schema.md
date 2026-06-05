# 02 — Event Schema

**Date:** 2026-06-02
**Task:** T97

```ts
type ObservabilityEvent =
  | { kind: "task.enqueued"; at: string; taskKind: TaskKind; promptSlug: string }
  | { kind: "task.started"; at: string; taskId: string }
  | { kind: "task.completed"; at: string; taskId: string; durationMs: number }
  | { kind: "task.held"; at: string; taskId: string; detail: string }
  | { kind: "task.failed"; at: string; taskId: string; reason: FailureReason }
  | { kind: "queue.drained"; at: string; summary: DrainSummary }
  | { kind: "settings.changed"; at: string; section: keyof PromptsSettings };
```

## Field rules

- `at` is ISO 8601 in (Core memory: Timezone).
- `taskId` is the ULID from `QueuedTask.id`.
- `durationMs` measured from `task.started` to `task.completed`.
- `promptSlug` is the only user-content field allowed; bodies are never emitted.

## Sinks

Two pluggable sinks:

```ts
interface ObservabilitySink {
  emit(event: ObservabilityEvent): void;
  flush?(): Promise<void>;
}
```

Defaults:
1. **SqliteSink** — appends to the session log (7-day prune per Core memory).
2. **ConsoleSink** — only when `debug.verboseLogging` is true; uses `console.groupCollapsed` (per project Injection Visibility standard).

## No-Retry compliance

Sinks MUST NOT retry failed writes. A failed `emit` logs once via the namespace logger and drops the event.

## Acceptance

- [ ] The implementation satisfies the `02 — Event Schema` contract in this file and the folder-level acceptance target: events, metrics, debug panel rows, and diagnostics exports follow the observability schema.
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

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
