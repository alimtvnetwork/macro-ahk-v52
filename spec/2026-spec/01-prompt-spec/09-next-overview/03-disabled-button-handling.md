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

## Acceptance

- [ ] The implementation satisfies the `03 — Disabled-Button Handling` contract in this file and the folder-level acceptance target: NextLoop submission, disabled-button handling, interruption, and cancellation behavior is deterministic.
- [ ] Verification passes when `E2E-next-001..005` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.