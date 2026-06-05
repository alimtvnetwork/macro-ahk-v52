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
