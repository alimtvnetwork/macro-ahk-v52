# Unit Tests

Location: `tests/engine/`. Runner: `bunx vitest run`.

## Coverage targets per module

| Module | File | Cases |
|--------|------|-------|
| State machine | `state-machine.test.ts` | every transition row from `01-state-machine.md`; invalid transitions throw `Reason='InvalidTransition'`; persist-before-side-effect order |
| Score parser | `score-parser.test.ts` | happy / last-wins / casing / OOR / not-found / truncated detail |
| Interpolator | `interpolator.test.ts` | each of 5 tiers, type coercion (String/Number/Boolean/Enum/Json), brace-injection guard, sensitive masking |
| Audit writer | `audit-writer.test.ts` | layout matches `04-audit-folder-writer.md`; collision → regenerate-once-then-fail; path-traversal rejected |
| Watchdog | `watchdog.test.ts` | per-step / total / loop-count fire at boundary; clamp-to-ceiling logs `TimeoutClampedToCeiling`; SW-restart re-arm with remaining budget |
| Message envelope | `message-envelope.test.ts` | `assertMessage` accepts each Kind; rejects unknown / missing RunId / bad TimestampKL |
| Schema validators | `schemas.test.ts` | every `schemas/*.schema.json` validates fixtures; `additionalProperties:false` enforced |
| Migrators | `migrators.test.ts` | each registered migrator: input fixture → expected output; sequential chain v1→vN |

## Fixtures
- Co-located under `tests/fixtures/engine/`.
- One fixture per case; JSON files only (no inline `JSON.stringify` in test bodies).
- Failure-shape fixtures asserted via deep-equal on the full `FailureLog` (no partial matchers).

## Determinism
- All tests use injected `Clock` (Asia/Kuala_Lumpur fixed instant) and seeded `RunId` factory.
- No network, no real `chrome.*` — `tests/helpers/chrome-stub.ts` provides typed in-memory `chrome.storage.local`.

## Forbidden in unit tests
- No `unknown` casts (per project standard).
- No swallowed catches (`expect(() => …).toThrow(<exact Reason>)`).
- No sleeps/waits — use fake timers (`vi.useFakeTimers`).
