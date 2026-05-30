# Issue 128 — Queue auto-resume when loop is running

## 1. Summary

When the macro loop is running and the Lovable **Queue** section has ≥1
pending task but the queue is in **paused** state (Play button visible
instead of Pause), the controller MUST automatically click the Play /
Resume button so queued prompts continue to drain.

This complements Issue 124's pause/resume gate — that gate only pauses the
queue on stop conditions; it does not re-arm it when the user (or Lovable)
left the queue paused while the loop is active.

## 2. Triggering conditions (ALL must be true)

| # | Condition | How detected |
|---|-----------|--------------|
| C1 | Macro loop is currently running | `LoopEngine.isRunning() === true` |
| C2 | Queue section is rendered on the page | Queue header element resolvable |
| C3 | Queue count ≥ 1 | Parsed integer from count badge |
| C4 | Queue is paused (Play button visible) | `isQueueResumeVisible() === true` AND `isQueuePauseVisible() === false` |

If any condition is false → do nothing.

## 3. DOM contract

### 3.1 Queue header (provided by user, 2026-05-30)

```
/html/body/div[2]/main/div/div[2]/div/div/div/div[1]/div/div[2]/div[1]/div[2]/div/div[1]/span/span
```

Renders the integer count inside:

```html
<span class="bg-muted-active/80 text-muted-foreground inline-flex ...">4</span>
```

### 3.2 Selector strategy (fallback waterfall)

Per project standards (`mem://ui/selector-standards` — prefer data-/aria
hooks over fragile absolute XPath):

1. **Primary** — exact XPath above (fast path, matches current Lovable build).
2. **Fallback A** — locate the outer header via the sibling
   `span[data-panel-open][aria-controls^="base-ui-"]` whose text starts
   with `"Queue"`, then read the trailing `<span>` numeric child.
3. **Fallback B** — `querySelector('span[aria-label="Pause queue"], span[aria-label="Resume queue"]')`
   then walk to the nearest header to extract the count sibling.

Return `null` (NOT `0`) when no header can be found, so callers can
distinguish "queue not visible" from "queue visible but empty".

## 4. Count parsing

- Read `textContent.trim()` of the count `<span>`.
- Parse via `Number.parseInt(text, 10)`.
- If `Number.isNaN(n) || n < 0` → log warning + return `null`.
- Cap reasonable upper bound: values > 999 are still returned as-is (no
  clamping); only invalid strings are rejected.

## 5. Auto-resume policy

```
function autoResumeQueueIfNeeded(): AutoResumeResult
  if !LoopEngine.isRunning()        → { acted: false, reason: 'loop-stopped' }
  count = readQueueCount()
  if count === null                 → { acted: false, reason: 'queue-missing' }
  if count === 0                    → { acted: false, reason: 'queue-empty' }
  if isQueuePauseVisible()          → { acted: false, reason: 'already-running' }
  if !isQueueResumeVisible()        → { acted: false, reason: 'no-resume-button' }
  result = resumeQueue()
  if !result.clicked                → { acted: false, reason: 'click-failed' }
  return { acted: true, reason: 'ok', count }
```

### 5.1 No-retry policy compliance

Per `mem://constraints/no-retry-policy`: a single click attempt per check
tick. If the click fails (button vanished between visibility check and
click), the next scheduled tick handles it.

### 5.2 Scheduling

- Hook into the existing loop heartbeat (Issue 124 gate runs every
  ~500 ms) — add `autoResumeQueueIfNeeded()` to the same tick.
- No new timer; no new interval registration. This keeps
  `mem://standards/timer-and-observer-teardown` clean.
- Pause when `document.hidden === true` (the parent gate already does this).

## 6. Logging

Per `mem://standards/error-logging-via-namespace-logger`:

- Use `RiseupAsiaMacroExt.Logger.info('[QueueAutoResume] clicked Play — count=' + n)` on success.
- Use `Logger.warn` for parse failures with full context:
  `{ rawText, xpathTried, fallbackTried }`.
- Never swallow errors; wrap the whole tick in `try/catch` and log via
  `Logger.error` with `Reason: 'QueueAutoResumeTickThrew'` + `ReasonDetail`.

## 7. Files to add / change

| File | Action |
|------|--------|
| `standalone-scripts/macro-controller/src/queue-control/queue-count.ts` | NEW — `readQueueCount()` with waterfall + `null` semantics |
| `standalone-scripts/macro-controller/src/queue-control/auto-resume.ts` | NEW — `autoResumeQueueIfNeeded()` policy from §5 |
| `standalone-scripts/macro-controller/src/queue-control/selectors.ts` | EDIT — add `QUEUE_COUNT_XPATH` constant |
| `standalone-scripts/macro-controller/src/queue-control/index.ts` | EDIT — re-export new helpers |
| `standalone-scripts/macro-controller/src/loop-run-state/*.ts` (or existing gate tick) | EDIT — invoke `autoResumeQueueIfNeeded()` once per tick |
| `standalone-scripts/macro-controller/src/queue-control/__tests__/queue-count.test.ts` | NEW — parsing + fallback waterfall tests |
| `standalone-scripts/macro-controller/src/queue-control/__tests__/auto-resume.test.ts` | NEW — policy matrix tests (all 6 branches in §5) |

## 8. Test matrix (mandatory per `mem://preferences/test-with-features`)

### 8.1 `queue-count.test.ts`

| # | DOM setup | Expected |
|---|-----------|----------|
| T1 | Full XPath path resolves to `<span>4</span>` | returns `4` |
| T2 | Primary XPath missing; fallback A finds Queue header with `<span>2</span>` | returns `2` |
| T3 | Header present with empty text | returns `null` + warn |
| T4 | Header present with `"abc"` text | returns `null` + warn |
| T5 | No queue header anywhere | returns `null` (no warn — expected) |
| T6 | Count text `"0"` | returns `0` |

### 8.2 `auto-resume.test.ts`

| # | LoopRunning | Count | Pause vis | Resume vis | Expected `acted` | Reason |
|---|-------------|-------|-----------|------------|------------------|--------|
| A1 | false | 4 | false | true | false | `loop-stopped` |
| A2 | true  | null | — | — | false | `queue-missing` |
| A3 | true  | 0 | false | true | false | `queue-empty` |
| A4 | true  | 4 | true  | false | false | `already-running` |
| A5 | true  | 4 | false | false | false | `no-resume-button` |
| A6 | true  | 4 | false | true | **true** | `ok` (click issued) |

## 9. Acceptance

- All 12 new tests pass.
- Existing 730 tests still pass (no regressions).
- Verified manually at 1043×757 viewport with a paused queue of 4
  pending tasks while the macro loop is running: Play is clicked within
  one heartbeat tick (~500 ms).

## 10. Out of scope

- Auto-pausing a running queue (Issue 124 owns that).
- Editing or reordering queued tasks.
- Showing UI feedback inside the macro-controller panel (logging only).
