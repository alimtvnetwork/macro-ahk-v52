# Step 40 — Workspace tooltip + Members popup (Issue 113)

**Time:** ~2 min · **Severity:** Low

- **Sources:** `mem://features/macro-controller/workspace-tooltip-members-popup`, `ws-hover-card.ts`, `ws-selection-ui.ts`.
- **Blind-AI likely output:** LLM would keep native `title=` attributes + Settings gear. Memory mandates singleton hover card, native title stripped, Members popup with Add/Remove/Promote mutations.
- **Actual:** `ws-hover-card.ts` exists, separate from list renderer — singleton-friendly structure.
- **Gap:** No test asserting `title=` is stripped from rendered DOM, or that only ONE hover card exists at a time.
- **Recommendation:** Add `ws-hover-card.singleton.test.ts`: render 5 rows, hover each in sequence, assert `document.querySelectorAll('[data-ws-hover-card]').length <= 1` and no element has a `title` attribute.
