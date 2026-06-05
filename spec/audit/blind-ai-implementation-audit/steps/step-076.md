# Step 76 — UI framework choice (React rejected for content scripts)

**Timestamp:** 2026-06-02
**Memory:** `mem://architecture/ui-framework-selection` (React rejected; UIManager used)

## Reasoning
The extension uses React only in Options/Popup; injected overlays use vanilla DOM via `UIManager`. A blind LLM may try to inject React into content scripts — instant bloat.

## Findings
- ✅ Memory clearly states the split.
- 🟡 **Med**: no lint rule preventing `import React` inside `src/content-scripts/`.
- 🟢 **Low**: no fixture demonstrating the canonical UIManager pattern.

## Recommendation
Boundary lint: `src/content-scripts/**` cannot import `react` or `react-dom`.
