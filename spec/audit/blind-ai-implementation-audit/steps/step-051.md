# Step 51 — Six-phase extension lifecycle spec

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Area:** Extension lifecycle & injection
**Spec:** `spec/26-chrome-extension-generic/04-architecture/01-six-phase-lifecycle.md`

## Reasoning
Memory (Core: extension-lifecycle 6 phases, audited via SQLite) claims a canonical phased model. A blind low-grade LLM needs an unambiguous phase ordering to reason about install vs. update vs. user-interaction flows. The spec file exists alongside `00-overview.md`, `02-three-world-model.md`, `03-message-relay.md` — solid foundation.

## Findings
- ✅ Spec present and indexed (`04-architecture/01..07`).
- 🟢 **Low**: no machine-readable phase enum referenced from `src/background/boot.ts` or `service-worker-main.ts` — blind LLM cannot cross-check code-to-phase mapping by symbol search.
- 🟢 **Low**: no test asserting `chrome.runtime.onInstalled` → seeding → cache-invalidation order.

## Recommendation
Export a `LifecyclePhase` enum from a shared module and reference it from boot + spec, so a low-grade LLM can grep one symbol and reach both sides.
