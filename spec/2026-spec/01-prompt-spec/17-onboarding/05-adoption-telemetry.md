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
