# Plan — Loop & Leak Fixes (audit 2026-05-15)

Source audit: `.lovable/audits/2026-05-15-infinite-loop-and-memory-leak-audit.md`.

Goal: eliminate the 5 cumulative memory-leak / browser-freeze contributors
found in the static scan. Every change must also guarantee that any
`setInterval`, `setTimeout`, `requestAnimationFrame`, `MutationObserver`, or
`addEventListener` it adds is paired with a teardown path (clear / disconnect /
remove). After each step: typecheck + run the relevant unit tests, do not bump
the version (one bump at the end).

---

## Step 1 — L-1 (P0) workspace-observer self-reschedule cap

**File**: `standalone-scripts/macro-controller/src/workspace-observer.ts`

Problem: `handleObserverMutation` calls `setTimeout(startWorkspaceObserver, 2000)`
when the nav element disappears. `startWorkspaceObserver` resets `retryCount = 0`
on every successful install, so under SPA churn the chain runs forever and
leaks detached `MutationObserver`s.

Changes:

- Add a separate `mutationReinstallCount` field on `WorkspaceObserverState`
  that is **NOT** reset on successful install.
- Track `mutationReinstallWindowStartedAt`. Reset the count only after a
  60 s quiet period.
- Cap at 10 reinstalls per 60 s. Past the cap, log a single
  `Logger.error()` with file path + reason and stop scheduling.
- Replace the fixed 2 s with backoff: 2 s → 5 s → 15 s → 60 s.
- Capture every `setTimeout` handle in the state and clear it in
  `wsObserverState.disconnect()` so teardown is leak-free.

---

## Step 2 — L-2 (P1) recorder-toolbar visibility-aware tick

**File**: `src/background/recorder/recorder-toolbar.ts`

Problem: `setInterval(renderHealth, 1000)` runs in hidden / bfcache tabs.

Changes:

- Drop cadence to 5 s.
- Pause when `document.hidden === true` (re-render once on `visibilitychange`
  back to visible, then resume).
- Add `pagehide` listener (once: true) that calls `Destroy()`.
- `Destroy()` already clears the interval — extend it to remove both
  listeners as well.

---

## Step 3 — L-3 (P1) startup-persistence observer scope + teardown

**File**: `standalone-scripts/macro-controller/src/startup-persistence.ts`

Problem: `MutationObserver` on `<body>` (fallback) never disconnects and
fires on every direct-child mutation.

Changes:

- Prefer `#root` / `main`; fall back to `body` only if neither exists, and
  log a warn when falling back.
- Return a `teardown()` from `setupPersistenceObserver` that:
  - calls `observer.disconnect()`
  - clears the pending `reinjectTimer`
  - cancels the pending `reinjectIdleHandle`
  - removes the `visibilitychange` listener
- Register a single `pagehide` listener that invokes `teardown()`.

---

## Step 4 — L-4 (P2) marco-sdk pollUntil tracked timer + L-5 message-relay in-flight cap

Two small, related changes batched in one step.

**L-4** — `standalone-scripts/marco-sdk/src/utils.ts`:

- Add module-local `_activePolls` set tracking `{ handle, label, startedAt }`.
- Wrap the existing `setInterval`/`clearInterval` so a forgotten poll is
  visible via a new `marco._diag.activePolls()` introspection helper.
- Always `clearInterval` on both resolve paths (already done) — extend to
  also remove from `_activePolls`.

**L-5** — `src/content-scripts/message-relay.ts`:

- Track `_inFlight` count of outstanding `chrome.runtime.sendMessage`
  callbacks.
- Reject new requests with `{ isOk: false, errorMessage: "Relay overloaded" }`
  when `_inFlight >= MAX_INFLIGHT` (50). Decrement in both the success and
  the `lastError` paths plus the `try/catch` send-error path.

---

## Step 5 — Verification, version bump, changelog

- Run `pnpm test` (focused on macro-controller + relay), `pnpm run typecheck`,
  `pnpm run lint`.
- `node scripts/bump-version.mjs minor` → 2.242.0 → 2.243.0.
- Pin install commands in `readme.md` to v2.243.0.
- Add `## [v2.243.0] — YYYY-MM-DD Loop & leak fixes (L-1…L-5)` to
  `changelog.md` summarising the 5 fixes.
- Update `.lovable/audits/2026-05-15-infinite-loop-and-memory-leak-audit.md`
  with a "Resolved" footer linking to the version.
- Move the **Stability — Loop & Leak Prevention** section in `plan.md` to
  the **Completed** list.

---

## Technical guarantees applied to every step

- Every `setInterval` / `setTimeout` handle is captured in a variable and
  cleared in a teardown function on the unhappy path.
- Every `MutationObserver` instance has an explicit `.disconnect()` path.
- Every `addEventListener` has a matching `removeEventListener` OR uses
  `{ once: true }`.
- Errors logged via `RiseupAsiaMacroExt.Logger.error()` (project rule), with
  exact file path + reason for any hard failure.
- No new `unknown`, no new `any`, no new swallowed catches outside the
  existing allow-swallow sites.
- No-retry policy: backoff ladders are bounded and stop, never recurse.
