# 03 — Jitter

**Date:** 2026-06-02
**Task:** T78

## Default source of truth

Implementations MUST use `JITTER_MS` from [Runtime Defaults](../reference/05-runtime-defaults.md) for timing variance. When a percentage UI is exposed, it MUST serialize back to a bounded delay delta that never exceeds the `JITTER_MS` range.

```ts
function effectiveDelay(cfg: DelayConfig): number {
  const pct = cfg.jitterPct ?? 0.2;
  if (pct <= 0) return cfg.baseMs;
  const span = cfg.baseMs * pct;
  return Math.round(cfg.baseMs + (Math.random() * 2 - 1) * span);
}
```

For example, a host may display variance as a percentage, but the stored runtime value MUST remain derived from `JITTER_MS` and the configured `DELAY_MS` base.

## Why

- Removes the regular cadence that some hosts treat as bot-like.
- Spreads load across the idle observer's sampling window.

## Bounds

Even with jitter, the resulting delay is clamped to the `DELAY_MS` range in [Runtime Defaults](../reference/05-runtime-defaults.md) to honour the validation rule in `01-default.md`.

## Disabling

`jitterPct: 0` produces a deterministic delay — useful for tests. The settings UI exposes a checkbox "Add timing variance" wired to `JITTER_MS` or zero.

## RNG

`Math.random()` is sufficient; jitter is not security-sensitive. No `crypto.getRandomValues` required.

## Acceptance

- [ ] The implementation satisfies the `03 — Jitter` contract in this file and the folder-level acceptance target: default delay, settings, jitter, skip-first, and pause semantics use runtime defaults.
- [ ] Verification passes when `UT-delay-001..006` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.