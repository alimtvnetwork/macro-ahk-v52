# 03 — Plan Settings

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T88

## Shape

```ts
interface PlanSettings {
  promptSlug: string;        // default "plan-default"
  stepCount: number;         // default 10, range 1..50
  delay: DelayConfig;        // default baseMs 12000, jitter 0.2, skipFirst false
  idleTimeoutMs: number;     // default 180000 (3 min, plans stream longer)
  autoOpenResult: boolean;   // default true — focus host output after completion
}
```

## Validation

- `stepCount` clamped to `[1, 50]`. Beyond 50 the model output degrades and the prompt template breaks numbering. Inline warning above 30.
- `idleTimeoutMs` clamped to `[30000, 600000]`. Below 30s plans routinely false-timeout.
- `promptSlug` MUST resolve at save time — unresolved slug surfaces a save error and the prior value is kept.

## Persistence

Single key `prompts.planSettings`. Schema-validated on load; corruption falls back to defaults with one warn log per session.

## Per-host overrides

Hosts may ship their own defaults by registering a `PlanDefaultsProvider` at boot. User edits always win over host defaults; user **reset** restores the host default, not the spec default.
