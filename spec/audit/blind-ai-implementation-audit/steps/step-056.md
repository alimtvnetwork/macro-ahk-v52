# Step 56 — Injection cache (build-aware invalidation)

**Timestamp:** 2026-06-02
**Memory:** `mem://architecture/injection-cache-management`

## Reasoning
Cache survives across version bumps unless invalidated — a stale cache after deploy is the canonical "why didn't my change ship" bug.

## Findings
- ✅ `src/background/injection-cache.ts` implements `invalidateCacheOnDeploy(reason)` keyed by `STORAGE_KEY_LAST_BUILD_ID`.
- 🔴 **Violation of Core rule (Namespace Logging)**: injection-cache uses `console.log("[injection-cache] ...")` instead of `RiseupAsiaMacroExt.Logger.*`. Adds to S13 backlog (24 → 25+).
- 🟡 **Med**: no test verifying cache invalidation actually triggers when `lastBuildId` differs from current.

## Recommendation
Add `injection-cache.invalidation.test.ts` + migrate `console.log` calls in this file to namespace logger.
