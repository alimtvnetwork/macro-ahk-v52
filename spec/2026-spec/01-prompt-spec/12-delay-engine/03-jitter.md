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

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** bind `DELAY_MS`, `JITTER_MS`, `SKIP_FIRST_DELAY` to `reference/05-runtime-defaults.md`; settings UI MUST clamp to declared min/max.
- **MUST** compute jitter as `DELAY_MS + randInt(-JITTER_MS, +JITTER_MS)` with `Math.random()` seeded by `crypto.getRandomValues` when available.
- **MUST** honour `SKIP_FIRST_DELAY=true` by emitting the first prompt with zero delay; subsequent prompts apply the full delay+jitter.
- **MUST** pause the delay timer when `pauseRequested=true` and resume from the remaining ms — never restart from zero.

## Pitfalls / Counter-examples

- ❌ `setTimeout(fn, DELAY_MS)` with no `clearTimeout` on cancel. ✅ Pair with teardown (see `mem://standards/timer-and-observer-teardown`).
- ❌ Jitter that can produce negative delays. ✅ `Math.max(0, DELAY_MS + jitter)`.
- ❌ Restarting the delay on pause/resume. ✅ Track `remainingMs` at pause; resume schedules `remainingMs`.
- ❌ Hardcoding 1500ms inline. ✅ Import the named constant.
- ❌ Adding exponential backoff on send failure. ✅ Fail fast; surface to user (no-retry policy).

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- The default operation budget is `5000 ms` and the default capacity is `3 items`; these values SHALL NOT be hardcoded inline.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

