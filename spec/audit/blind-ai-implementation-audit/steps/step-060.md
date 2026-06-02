# Step 60 — Timer & observer teardown (lifecycle hygiene)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Core rule:** Timer & observer teardown — v2.243.0 audit L-1..L-5
**Memory:** `mem://standards/timer-and-observer-teardown`

## Reasoning
Unpaired `setInterval` / `MutationObserver` / listeners leak memory and silently corrupt state across SPA navigations. Highest-impact cross-cutting hygiene rule.

## Findings
- ✅ Rule documented; v2.243.0 audit referenced explicitly with L-1..L-5 IDs.
- 🔴 **Enforcement gap**: no lint rule and no CI script that pairs `setInterval(` with `clearInterval(`, or `new MutationObserver(` with `.disconnect()`. A blind LLM **will** introduce leaks.
- 🟡 **Med**: no `pagehide` listener audit; rule says "every tick UI pauses on `document.hidden`" — untested.
- 🟢 **Low**: no fixture demonstrating the canonical "good" teardown pattern for LLM imitation.

## Recommendation
Write `scripts/audit-timer-teardown.mjs` that scans for unpaired primitives and fails CI. Mirrors `audit-error-swallow.mjs` pattern already in the repo.

---

## Batch 6 summary (steps 51–60)
- 🔴 **High** S57 (no `builtin-script-guard` test — violates test-with-features), S60 (no enforcement of timer-teardown rule).
- 🔴 **Adds 1 to S13 backlog**: `injection-cache.ts` uses `console.log`, not namespace `Logger`.
- 🟡 **Med** S52 (no world-boundary lint), S53 (no typed message catalog), S54 (no `InjectionStage` enum), S56 (no invalidation test), S58 (no `.require()` audit), S59 (no status enum/snapshot).
- 🟢 **Low** S51, S55 (one missing shortcut-handler test).
- ✅ **Strong**: new-tab guard (S55) — well-tested, single helper, 5 clean call-sites.
