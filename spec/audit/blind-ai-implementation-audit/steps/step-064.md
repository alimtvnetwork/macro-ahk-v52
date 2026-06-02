# Step 64 — Build artifact preservation (`emptyOutDir: false`)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://architecture/build-artifact-preservation`

## Reasoning
Wiping `dist/` would destroy instruction metadata emitted in an earlier step.

## Findings
- ✅ Memory captures rationale; Vite config preserves output.
- 🟡 **Med**: no test snapshotting `dist/` after multi-stage build to assert metadata survives.
- 🟢 **Low**: no inline comment in `vite.config.ts` linking to memory rule — blind LLM may "tidy up" by setting `emptyOutDir: true`.

## Recommendation
Add a header comment in `vite.config.ts`: `// emptyOutDir:false REQUIRED — see mem://architecture/build-artifact-preservation`.
