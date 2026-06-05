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
