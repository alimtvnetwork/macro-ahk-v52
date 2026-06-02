# Step 39 — Workspace badge classifier (v3.12.0)

**Time:** ~2 min · **Severity:** Low

- **Sources:** `mem://features/macro-controller/workspace-badge-display`, `workspace-status.ts`, `ws-list-renderer.ts`.
- **Blind-AI likely output:** LLM would scatter classification logic. Memory mandates single classifier + tone resolver, 10-char max, muted gray for canceled (never red), Refill-soon chip.
- **Actual:** `workspace-status.ts` looks like the consolidated classifier; renderer consumes it.
- **Gap:** No test asserting the 10-char cap or "canceled never red" invariants.
- **Recommendation:** Add `workspace-status.badge-invariants.test.ts` covering: every label ≤ 10 chars; canceled tone is `muted-gray` not `destructive`; Refill-soon emits when daysToRefill ≤ K.
