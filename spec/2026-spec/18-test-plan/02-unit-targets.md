# 02 — Unit Test Targets

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T107

## Modules and what to assert

### Loader (`04-loader-contract/`)
- Slug collision → user wins, default kept for reset.
- Cache key `"prompts:all"` invalidated on `created`/`updated`/`deleted` events.
- Variable resolution order: Caller > Editor > Clock > Empty.
- Every `PromptError.reason` mapped from a synthetic input.

### Queue engine (`10-queue-model/`, `11-queue-lifecycle/`)
- One task `processing` at a time even with concurrent `tick()` calls.
- `attemptCount` never exceeds 1 across all paths.
- Capacity rejection is atomic for bulk enqueue.
- FIFO holds under concurrent `add` + `moveTo`.

### Delay engine (`12-delay-engine/`)
- `effectiveDelay` clamps to `[1000, 60000]` even when base+jitter exceeds bounds.
- `skipFirst` resets on drain and on `cancelAll` but not on `pause`.
- `InterruptibleDelay.wait` rejects immediately when `signal.aborted` is true before invocation.

### Settings (`15-settings/`)
- Corrupt JSON falls back to defaults + one warn log.
- Migrations called with the right `fromVersion`.
- `adapterPriority` unknown ids dropped silently.

### Failure record (`13-failure-handling/`)
- Builder produces non-empty `selectorAttempts` and `variableContext` for every reason — even when category is "n/a" the entry has `reason: null`.
- Verbose toggle gates only the truncation, never structural fields.
