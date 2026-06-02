# Step 54 — Injection pipeline (script-injection-lifecycle 7 stages)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Spec:** `04-architecture/07-injection-pipeline.md`
**Memory:** `mem://architecture/script-injection-lifecycle` (7-stage via SW MAIN world)

## Reasoning
Auto-injector touches every page navigation; correctness here gates entire product.

## Findings
- ✅ Pipeline files: `auto-injector.ts`, `auto-attach.ts`, `auto-attach-runner.ts`, `spa-reinject.ts`, `csp-fallback.ts`, `script-resolver.ts`, `dependency-resolver.ts`.
- 🟡 **Med**: 7 stages are described in prose but not enumerated as a constant or test matrix — blind LLM cannot reliably extend a stage without skipping one.
- 🟢 **Low**: `spa-reinject-burst.test.ts` covers burst suppression; no end-to-end "all 7 stages run in order" assertion.

## Recommendation
Add `InjectionStage` enum + a single integration test that observes stage ordering through `injection-chain-tracker.ts`.
