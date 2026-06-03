# 05 — Adoption Telemetry

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
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
