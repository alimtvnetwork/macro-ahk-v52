# 01 — Test Plan Overview

**Date:** 2026-06-02
**Task:** T106

## Pyramid

| Layer | Coverage target | Runtime |
|-------|-----------------|---------|
| Unit | 80 % of pure logic (loader, queue, delay, validators, settings migrations) | Vitest |
| Integration | Every adapter × every editor type combination | Vitest + happy-dom |
| Component | Every interactive UI (dropdown, queue widget, settings, plan panel) | Vitest + Testing Library |
| E2E | The 5 happy paths from the onboarding tour | Manual Chrome (lift per Core memory) |

## Test-with-features rule

Per Core memory, every new feature ships with tests in the same change. No PR adds a queue helper without a queue helper test; no PR adds a UI surface without a Testing Library spec.

## Determinism

- All timer-based logic uses an injected clock so tests do not sleep.
- The delay engine accepts a deterministic RNG seed.
- ULID generation accepts an injected `now` so task ids are stable in fixtures.

## Forbidden in tests

- `setTimeout`/`setInterval` without fake timers.
- Network calls (mocked at the fetch boundary).
- Real DOM operations against a live host page (use happy-dom fixtures).

## Acceptance

- [ ] The implementation satisfies the `01 — Test Plan Overview` contract in this file and the folder-level acceptance target: test inventories, target lists, fixtures, and mocks remain discoverable by automation.
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

