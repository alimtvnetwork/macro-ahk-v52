# 01 — Observability Goals

**Date:** 2026-06-02
**Task:** T96

## What we want to answer

1. **Reliability** — what % of tasks complete vs hold vs fail, per `kind`?
2. **Latency** — distribution of `submit → idle` per kind.
3. **Failure mix** — which `FailureReason` codes dominate?
4. **Throughput** — tasks per minute during active drains.
5. **Adoption** — how often each prompt slug is used.

## Non-goals

- Cross-user analytics (privacy + project Non-Goals).
- Server-side aggregation (host owns transport, if any).
- Real-time dashboards inside the feature (a debug panel is enough).

## Constraints

- Zero network calls by default — local SQLite (per Core memory: Session Logging) only.
- Verbose payloads gated by `debug.verboseLogging`.
- No PII in metric values — slug + counts + durations only.

## Acceptance

- [ ] The implementation satisfies the `01 — Observability Goals` contract in this file and the folder-level acceptance target: events, metrics, debug panel rows, and diagnostics exports follow the observability schema.
- [ ] Verification passes when `UT-obs-001..008` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
