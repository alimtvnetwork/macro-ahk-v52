# Step 81 — Planning roadmap (`plan.md`)

**Timestamp:** 2026-06-02
**Memory:** `mem://workflow/planning-roadmap`
**Files:** `plan.md` (561 lines), `.lovable/plan.md` (20 lines), `.lovable/plan-26-chrome-extension-generic.md`, `.lovable/plans/`

## Reasoning
A blind LLM relies on a single authoritative backlog. Multiple plan files create ambiguity.

## Findings
- 🔴 **High**: Three+ plan locations (`plan.md`, `.lovable/plan.md`, `.lovable/plan-26-chrome-extension-generic.md`, `.lovable/plans/`). Memory says `plan.md` is canonical, but `.lovable/plan.md` exists and Lovable's system prompt references it.
- 🟡 **Med**: no header in `.lovable/plan.md` redirecting to `plan.md` as SOT.

## Recommendation
Make `.lovable/plan.md` a 1-line pointer: `See ../plan.md`.
