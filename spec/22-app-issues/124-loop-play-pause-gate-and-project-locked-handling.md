# Issue 124 — Loop Play/Pause Gate & Project-Locked Error Handling

**Version target:** v3.37.0
**Owner modules:** `standalone-scripts/macro-controller/src/ws-adjacent.ts`, `ws-move.ts`, new `loop-run-state.ts`, new `project-lock-detector.ts`

---

## 1. Problem

Two related gaps when the macro loop moves between workspaces:

1. **No run-state gate before moving.** Adjacent move (up/down) fires as soon as the user clicks, even while a Lovable run is still streaming in the current workspace. Result: half-finished runs are abandoned.
2. **`project locked` errors are silently lost.** When the destination workspace returns "project is locked", the error is logged but never persisted, so the next move repeats the same failure.
3. **No auto-resume after a successful move.** The user must manually click Play after every move-down/up.

## 2. Behaviour contract

### 2.1 Pre-move gate (move-down / move-up / move-to)

Before issuing the move API call:
1. Read the **Play button** XPath (see §5). If the Play button is present and clickable → run is paused/finished → proceed with the move.
2. If the Play button is absent (i.e. Pause button is showing → run is in progress) → **do not move**. Show toast `"Waiting for current run to finish…"` and poll the Play button every `RUN_GATE_POLL_MS = 1000` ms up to `RUN_GATE_TIMEOUT_MS = 120_000` ms.
3. On timeout → log + toast `"Run still active after 2 min — move cancelled"`. No retry, no backoff (per `mem://constraints/no-retry-policy`).

### 2.2 Project-locked detection & persistence

When the move API or the post-move project-load surfaces a "project locked" condition:
1. Detect via the response body (`error` or `message` field containing `"project is locked"`, `"project_locked"`, or HTTP 423) **or** via a DOM banner matching the locked-banner XPath (§5).
2. Persist the error into a new SQLite table `LoopProjectLockEvent` with columns:
   - `EventId INTEGER PK AUTOINCREMENT`
   - `WorkspaceId TEXT NOT NULL`
   - `ProjectId TEXT NOT NULL`
   - `DetectedAtMs INTEGER NOT NULL`
   - `Reason TEXT NOT NULL` — short code: `api-423`, `api-body-locked`, `dom-banner`
   - `ReasonDetail TEXT NOT NULL` — full server message or banner text
3. After persisting, treat the source workspace's run as paused-but-stuck: click the **Pause** button (§5) defensively, then enter the §2.1 wait loop on the destination workspace until Play is visible.

### 2.3 Auto-press Play after successful move

After `moveToWorkspace` resolves successfully and the destination URL loads:
1. Wait for the Play button to appear via `pollUntil(playSelector, { intervalMs: 500, timeoutMs: 15_000 })`.
2. Click it once. Log `LoopRun.autoPlay ws=<id> outcome=ok`.
3. On timeout, log `LoopRun.autoPlay outcome=play-button-missing` (no retry) and continue.

## 3. New modules

```
standalone-scripts/macro-controller/src/
  loop-run-state/
    index.ts            # public API: waitForPlayReady(), pressPlay(), pressPause(), isPlayVisible()
    selectors.ts        # PLAY_BUTTON_XPATH, PAUSE_BUTTON_XPATH, LOCKED_BANNER_XPATH (see §5)
    poll.ts             # pollUntil helper (re-export from existing poll-util)
  project-lock/
    detector.ts         # detectProjectLocked(response, dom) → ProjectLockEvent | null
    store.ts            # SQLite upsert/list for LoopProjectLockEvent
    types.ts            # ProjectLockEvent, ProjectLockReason
```

## 4. Wiring

- `ws-adjacent.ts → moveToAdjacentWorkspace()`: gate via `waitForPlayReady()` BEFORE calling `moveToWorkspace`.
- `ws-move.ts → moveToWorkspace()` (existing): after the existing post-move `fetchAndPersist` credit refresh, call `pressPlay()`.
- `ws-move.ts → executeMove() / executeSwitchContext()`: on error path, run `detectProjectLocked` and `project-lock.store.persist()` if a lock is detected; then click Pause + re-enter the gate.

## 5. Selectors (BLOCKED — pending user input)

These three XPaths are required from the user. Until provided, the modules MUST throw `Error('LoopRunState selectors not configured')` if invoked, and the wiring stays behind a feature flag `Loop.RunStateGate.Enabled = false`:

| Constant | Purpose | Provided? |
|----------|---------|-----------|
| `PLAY_BUTTON_XPATH` | The Play button visible when a run is idle/paused | ❌ pending |
| `PAUSE_BUTTON_XPATH` | The Pause button visible during an active run | ❌ pending |
| `LOCKED_BANNER_XPATH` | DOM banner shown when the project is locked | ❌ pending (optional — API check sufficient as fallback) |

## 6. Tests (ship with feature)

- `loop-run-state/__tests__/play-gate.test.ts` — `waitForPlayReady` resolves immediately when Play visible; polls + resolves when Play appears mid-wait; rejects on timeout.
- `loop-run-state/__tests__/press-play.test.ts` — `pressPlay` clicks once; no-op + log when button missing; no retry.
- `project-lock/__tests__/detector.test.ts` — recognises HTTP 423, body `project_locked`, body `"project is locked"`, DOM banner; returns null otherwise.
- `project-lock/__tests__/store.test.ts` — persist + list ordering; idempotent on duplicate event within 1s.
- `ws-adjacent.integration.test.ts` — move-down with active run blocks → polls → moves once Play appears; locked response is persisted and triggers Pause + re-wait.

## 7. Acceptance

- [ ] Move-down while a run is streaming waits and only moves after Play appears.
- [ ] A `project is locked` response writes one row to `LoopProjectLockEvent` and does not silently swallow.
- [ ] After every successful move, Play is auto-clicked when it appears within 15s.
- [ ] All four new test files pass.
- [ ] Feature flag `Loop.RunStateGate.Enabled` controls activation; defaults OFF until XPaths are populated.

---

## 5-step task plan

1. **Spec + ambiguity log** *(this turn)*: write this spec, log XPath ambiguity, no code changes.
2. **`loop-run-state` module + tests**: `selectors.ts` (placeholders behind flag), `index.ts` with `isPlayVisible/waitForPlayReady/pressPlay/pressPause`, unit tests for gate + press.
3. **`project-lock` module + tests**: detector (API + DOM), SQLite store, unit tests.
4. **Wiring + integration tests**: gate inside `moveToAdjacentWorkspace`, auto-Play inside `moveToWorkspace`, locked-error catch path; integration test.
5. **Activate flag + version bump v3.37.0**: flip `Loop.RunStateGate.Enabled = true` once user supplies real XPaths; bump manifest/constants/changelog.
