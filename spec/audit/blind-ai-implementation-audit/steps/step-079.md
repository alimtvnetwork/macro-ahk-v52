# Step 79 — Workspace badge display + tooltip popup

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://features/macro-controller/workspace-badge-display` (v3.12.0), `workspace-tooltip-members-popup` (Issue 113)

## Reasoning
Unified label classifier (Cancel/Expire/Expired/Refill) + singleton hover-card are tightly coupled UI invariants.

## Findings
- ✅ Memory specifies 10-char max, muted-gray for canceled (never red), refill-soon filter chip.
- 🟡 **Med**: no snapshot test asserting each (status, tone) tuple renders with the documented class.
- 🟢 **Low**: no test asserting `title=""` is stripped from workspace rows (replaced by hover card).

## Recommendation
Component snapshot test fixture covering all 4 badge states + canceled muted-gray invariant.
