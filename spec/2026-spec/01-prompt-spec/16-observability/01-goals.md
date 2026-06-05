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

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md` (e.g. `DELAY_MS = 5000 ms`, `MAX_RETRIES = 3`).
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
