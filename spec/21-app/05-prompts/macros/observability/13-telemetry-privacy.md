# Telemetry & Privacy Policy

Status: Normative · v1.0.0 · 2026-06-02

## Principles
- **No off-device telemetry.** All metrics + logs stay in SQLite/OPFS.
- **Verbose data is opt-in per project** (`Project.VerboseLogging`, default OFF).
- **Sensitive values are masked at source**, never post-hoc (variables/13).

## What is collected (always)
- Reason codes (observability/12), metric counters (observability/11), durations.
- Selector strategy names — NOT selector expressions when matched against sensitive fields.

## What is collected only when verbose ON
- Full HTML snippets (untruncated)
- Full text content of matched nodes
- Resolved variable values (with sensitive patterns still masked)

## What is NEVER collected
- Bearer tokens, cookies, localStorage entries outside macro scope
- Form values matching `sensitive-patterns` (variables/13) even in verbose mode
- Cross-origin frame contents

## Retention
- OPFS logs: 7-day rolling prune (session-logging-system).
- Audit JSON: until user deletes project.

## User controls
- Settings → Debugging → Verbose Logging toggle (per project).
- Export bundle (log-diagnostics-export) — user-initiated only.
