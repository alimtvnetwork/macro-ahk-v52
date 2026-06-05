# 05 — Export & Diagnostics

**Date:** 2026-06-02
**Task:** T100

## ZIP layout

```
prompts-diagnostics-<YYYYMMDD-HHmm>.zip
├── events.jsonl           # one ObservabilityEvent per line, ASC by `at`
├── failures.jsonl         # one FailureRecord per line
├── settings.json          # current PromptsSettings, secrets-stripped
├── metrics.json           # MetricsSnapshot at export time
└── readme.txt             # generated header only (see project rule)
```

## readme.txt content rule

Per the project-wide SP-1..SP-7 prohibitions, `readme.txt` MUST NOT include any time/clock/timestamp/git value. The diagnostics export writes a fixed header only:

```
Prompts diagnostics export.
See events.jsonl for the raw event stream.
```

No timestamps, no version stamps, no "generated at" lines.

## Generation

Pure synchronous build from in-memory snapshots → single `Blob` → triggers download. No background workers.

## Privacy review (pre-export)

The export panel surfaces a checklist:
- "Include prompt slugs?" (default yes)
- "Include settings?" (default yes, with secrets stripped)
- "Include verbose bodies?" (default **no** even if verbose logging is on)

Users must tick "I reviewed the contents" before the download button enables.

## Acceptance

- [ ] The implementation satisfies the `05 — Export & Diagnostics` contract in this file and the folder-level acceptance target: events, metrics, debug panel rows, and diagnostics exports follow the observability schema.
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
