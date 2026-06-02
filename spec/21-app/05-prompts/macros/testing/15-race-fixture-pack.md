# Concurrency Race Fixture Pack (R-01..R-05)

Status: Normative · v1.0.0 · 2026-06-02

Companion to engine/17-concurrency-model.md. Each fixture is a deterministic
scenario for unit/component/E2E tests in testing/10..12.

## R-01 Stop during dispatch
- Setup: macro with 5 steps; pause hook at step 3.
- Action: user clicks Stop while step 3 awaits selector.
- Expect: step 3 completes OR aborts at safe point; state=`Stopped`; audit `outcome=stopped`; no step 4 dispatched.
- Fixture: `fixtures/race/r01-stop-during-dispatch.json`

## R-02 Navigation mid-run
- Setup: macro on page A; step 4 triggers navigation.
- Expect: `pagehide` runs teardown; reason `F_NAV_INTERRUPT`; runner removed from map; audit finalized.
- Fixture: `fixtures/race/r02-nav-interrupt.json`

## R-03 Double-queue same tab
- Setup: runner active on tabId=42.
- Action: second `RUN_MACRO` message for tabId=42.
- Expect: reject with `F_BUSY`; UI toast E-09; first run untouched.
- Fixture: `fixtures/race/r03-busy-reject.json`

## R-04 Watchdog during pending step
- Setup: step polls forever; watchdog timeout=2s.
- Expect: `cancelRequested=true` set at 2s; step exits at next safe checkpoint within ≤100ms; reason `F_WATCHDOG`.
- Fixture: `fixtures/race/r04-watchdog-cancel.json`

## R-05 Concurrent storage write/read
- Setup: macro reads project while UI saves settings.
- Expect: reader sees consistent snapshot; writer queued via `SafeWriter`; no torn state.
- Fixture: `fixtures/race/r05-storage-snapshot.json`

## Test plan
- Unit: assert state machine transitions (testing/10).
- Component: simulate Stop button + pagehide events (testing/11).
- E2E: real Chrome with navigation + Stop (testing/12).

## Acceptance
All 5 fixtures must pass before any change to engine/17 ships.
