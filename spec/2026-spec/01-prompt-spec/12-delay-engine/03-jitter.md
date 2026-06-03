# 03 — Jitter

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T78

## Default: **±20 %** symmetric jitter

```ts
function effectiveDelay(cfg: DelayConfig): number {
  const pct = cfg.jitterPct ?? 0.2;
  if (pct <= 0) return cfg.baseMs;
  const span = cfg.baseMs * pct;
  return Math.round(cfg.baseMs + (Math.random() * 2 - 1) * span);
}
```

For `baseMs = 7000, jitterPct = 0.2` → uniform in `[5600, 8400]`.

## Why

- Removes the regular cadence that some hosts treat as bot-like.
- Spreads load across the idle observer's sampling window.

## Bounds

Even with jitter, the resulting delay is clamped to `[1000, 60000]` to honour the validation rule in `01-default.md`.

## Disabling

`jitterPct: 0` produces a deterministic delay — useful for tests. The settings UI exposes a checkbox "Add timing variance" wired to `0.2` / `0`.

## RNG

`Math.random()` is sufficient; jitter is not security-sensitive. No `crypto.getRandomValues` required.
