# 05 — Adoption Telemetry

**Date:** 2026-06-02
**Task:** T105

## Onboarding-specific events

Extends `ObservabilityEvent` (see `16-observability/02-event-schema.md`):

```ts
type OnboardingEvent =
  | { kind: "onboarding.stepCompleted"; at: string; step: 1 | 2 | 3 | 4 | 5 }
  | { kind: "onboarding.skipped"; at: string; atStep: number }
  | { kind: "onboarding.completed"; at: string; totalDurationMs: number }
  | { kind: "onboarding.tourReplayed"; at: string };
```

## Local-only

Same sinks as observability — SQLite by default, no network egress. Useful only for the user's own debug panel and diagnostics export.

## Adoption metrics (debug panel)

| Metric | Definition |
|--------|------------|
| `onboarding.completionRate` | completed / (completed + skipped) over all sessions |
| `onboarding.dropoffStep` | mode of `atStep` from skip events |
| `onboarding.medianDurationMs` | median `totalDurationMs` from completed events |

## Privacy

- No prompt slugs in onboarding events.
- No host URLs.
- Duration is a number; step indices are 1–5.

## Acceptance

- [ ] The implementation satisfies the `05 — Adoption Telemetry` contract in this file and the folder-level acceptance target: first-run, guided tour, empty states, help, and adoption telemetry remain discoverable.
- [ ] Verification passes when `E2E-onb-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../readme.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Documentation standards](mem://workflow/documentation-standards) for the authoritative rule backing the MUST/SHALL statements in this file.
