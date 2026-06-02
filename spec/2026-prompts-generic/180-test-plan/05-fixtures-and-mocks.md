# 05 — Test Fixtures & Mocks

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T110

## Shared fixtures

- `makeClock(initialMs)` — monotonic clock with `advance(ms)` and `now()`.
- `makeRng(seed)` — deterministic xorshift; injected into jitter calc.
- `makeUlid(clock)` — ULID generator bound to the test clock for stable ids.
- `makePromptStore(seed: Prompt[])` — in-memory store implementing `PromptStore`.
- `makeQueueStore()` — in-memory store implementing `QueueStore` with synchronous event delivery for assertions.
- `makeBusyIdleObserver(scriptedResults: IdleResult[])` — yields the next scripted result per `whenIdle` call.
- `makeSubmitButton(state)` — returns a host element + a way to flip `disabled`/`aria-disabled`.

## Fixture corpus

`spec/2026-prompts-generic/fixtures/` (created later alongside implementation):

```
fixtures/
  prompts/
    plan-default/{info.json, prompt.md}
    rewrite-friendly/{info.json, prompt.md}
    bad-slug/{info.json, prompt.md}        # for negative tests
  bundles/
    sample.zip                              # round-trip import/export test
  failures/
    submit-disabled.json                    # canonical FailureRecord shape
    insert-rejected.json
```

## Mock policy

- Mocks are **typed** against the interfaces in the spec — no `any`, no `unknown` (Core memory: Unknown usage policy).
- Mocks live alongside the module they support, not in a global `__mocks__/` heap.
- Spies use `vi.fn<TypedSignature>()` so renaming a method breaks the test, not silently passes it.

## Coverage gate

CI fails the suite if coverage drops below the targets in `01-overview.md`. No flake-tolerance retries — sequential fail-fast per the No-Retry Policy.
