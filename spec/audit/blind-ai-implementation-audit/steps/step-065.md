# Step 65 — Vite build environment (Node built-in imports)

**Timestamp:** 2026-06-02
**Memory:** `mem://constraints/vite-build-environment`

## Reasoning
Dynamic `await import('node:fs')` inside Vite hooks fails sporadically; static top-level imports are mandatory.

## Findings
- ✅ Rule documented in memory.
- 🟡 **Med**: no lint rule rejecting dynamic `import('node:*')` inside `vite.config.ts` or plugins.
- 🟢 **Low**: no fixture demonstrating the failure mode.

## Recommendation
ESLint rule `no-restricted-syntax` blocking dynamic `node:` imports in `vite.config.ts` and `scripts/`.
