# 01 — Default Delay

**Date:** 2026-06-02
**Task:** T76

## Default: **7000 ms** (window 5000–10000 ms)

```ts
const DELAY_DEFAULTS = {
  baseMs: 7000,
  minMs: 5000,
  maxMs: 10000,
} as const;
```

## Why this window

- **< 5s** races common host autosave/streaming finalisers — submit click can land before the previous reply settles.
- **> 10s** wastes user time on simple prompts; perceived latency dominates.
- **7s** is the median observed "fully idle" point across the reference corpus.

## Where the delay sits

Between iterations: `submit → observer.Idle → delay → next insertText`. It is **not** applied before the first task (see `04-skip-first.md`).

## Validation

Settings UI must clamp user input to `[1000, 60000]` and surface a warning outside `[5000, 10000]`. Below 5s risks host throttling; above 10s degrades UX.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.
