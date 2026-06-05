# Step 66 — Sourcemap strategy

**Timestamp:** 2026-06-02
**Memory:** `mem://architecture/sourcemap-strategy` (dev=inline, prod=none)

## Reasoning
Prod sourcemaps leak source — must be off at build AND release.

## Findings
- ✅ Documented in memory; enforced at build + release per memory.
- 🟢 **Low**: no test asserting `.map` files are absent from release artifact.

## Recommendation
Add `scripts/check-no-prod-sourcemaps.mjs` invoked in `release.yml` postbuild.
