# 03 — Disabled-Button Handling

**Date:** 2026-06-02
**Task:** T63

## Policy: retry-once-after-readiness-check

Per project Core memory (**No-Retry Policy**), there is **no exponential backoff** and **no recursive retry loop**. The engine attempts at most **two** readiness checks per task:

```
attempt 1: resolve() → if ready → click → done
           else: wait `readinessGraceMs` (default 750ms) and re-check ONCE
attempt 2: resolve() → if ready → click → done
           else: fail-fast with reason="SubmitDisabled"
```

## Configuration

```ts
interface ReadinessConfig {
  readinessGraceMs: number;     // default 750
  treatAriaDisabledAsBlocking: boolean; // default true
}
```

## Reasons surfaced

- `SubmitMissing` — resolver returned null on both attempts.
- `SubmitDisabled` — element present but `isReady` returned false on both attempts.

Each failure MUST emit the mandatory failure log shape (`Reason`, `ReasonDetail`, `SelectorAttempts[]`).
