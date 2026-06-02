# Step 75 — Constant naming (SCREAMING_SNAKE_CASE prefixes)

**Timestamp:** 2026-06-02 (Asia/Kuala_Lumpur)
**Memory:** `mem://architecture/constant-naming-convention` (ID_, SEL_, ATTR_, CSS_)

## Reasoning
Prefixed constants enable grep-by-role for a blind LLM.

## Findings
- ✅ Convention documented.
- 🟡 **Med**: no ESLint custom rule enforcing prefix on constants in `*-constants.ts` files.
- 🟢 **Low**: no audit counting compliance rate.

## Recommendation
Add `eslint-plugin-naming-convention` rule for files matching `**/constants.ts`.
