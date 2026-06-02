# Step 59 — Injection visibility (console.groupCollapsed status)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://architecture/injection-visibility-system` + Open Lovable Tabs feature

## Reasoning
Visibility is the ONLY way a human (or LLM via screenshot) can debug injection. If status icons drift from actual state, downstream reasoning breaks.

## Findings
- ✅ `injection-diagnostics.ts` + `injection-chain-tracker.ts` + `injection-timing-history.ts` present.
- 🟡 **Med**: status icon mapping (green/amber/gray) lives in TS strings — no enum, no snapshot test.
- 🟢 **Low**: Open Lovable Tabs popup (Issue 111) implemented but no test asserts probe-amber vs. inject-green precedence.

## Recommendation
Extract `InjectionStatus` enum + icon map to one file; snapshot-test the popup rendering for each status.
