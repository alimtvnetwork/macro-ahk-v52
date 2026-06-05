# PERF-5 — `network-reporter` flush interval ticks forever on every tab

**Severity:** 🟠 HIGH · **Filed:** 2026-06-03 () · **Owner:** content-scripts

## Symptom
Content script matches `<all_urls>`. `setInterval(flushBuffer, FLUSH_INTERVAL_MS)` (line 300, armed at module top-level line 305) runs forever per tab — no `clearInterval`, no visibility gate, no idle backoff. Forgotten background tabs accumulate CPU + serialization cost.

## Root cause
`initNetworkReporter()` is designed as a "fire once at document_start" — no lifecycle hook for long-lived tabs or `pagehide`.

## Fix (no code yet)
1. Capture the interval ID in module scope.
2. Add `document.addEventListener('visibilitychange', …)` — pause flush while hidden; flush once on resume.
3. Add `window.addEventListener('pagehide', stopNetworkReporter, { once: true })` clearing the interval + flushing one last time.
4. Backoff: if 5 consecutive flushes have empty buffer, double the interval up to 30 s; reset on first non-empty buffer.
5. Vitest covering: hidden→no ticks, pagehide→cleared, empty-buffer→backoff, non-empty→reset.

## Cross-refs
- `plan.md` PERF-5 · 2nd-biggest battery win after PERF-1
- `mem://standards/timer-and-observer-teardown`
