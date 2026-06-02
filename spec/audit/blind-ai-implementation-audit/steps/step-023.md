# Step 23 — `spec/06-seedable-config-architecture` vs `instruction.ts`

**Time:** ~2 min · **Severity:** Low

- **Sources:** `spec/06-seedable-config-architecture/`, `mem://architecture/instruction-driven-seeding`, `mem://architecture/instruction-dual-emit-phase-2b`.
- **Blind-AI likely output:** With both memory entries and spec, LLM can emit PascalCase canonical + camelCase compat correctly.
- **Actual:** Spec scaffolding present (fundamentals, features, issues, acceptance, changelog).
- **Gap:** Dual-emit invariant (PascalCase + camelCase parity) has no parity test in the file tree sample.
- **Recommendation:** Add `compile-instruction.dual-emit.test.ts` asserting both outputs contain the same key set after case-folding.
