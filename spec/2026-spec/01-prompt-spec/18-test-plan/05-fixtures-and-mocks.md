# 05 — Test Fixtures & Mocks

**Date:** 2026-06-02
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

`spec/2026-spec/01-prompt-spec/fixtures/` (created later alongside implementation):

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

## Acceptance

- [ ] The implementation satisfies the `05 — Test Fixtures & Mocks` contract in this file and the folder-level acceptance target: test inventories, target lists, fixtures, and mocks remain discoverable by automation.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).

---

> Owner: see [Test-with-features](mem://preferences/test-with-features) for the authoritative rule backing the MUST/SHALL statements in this file.
