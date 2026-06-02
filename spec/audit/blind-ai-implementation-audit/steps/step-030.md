# Step 30 — Data type definitions (`SqlValue`, `JsonValue`, `CaughtError`)

**Time:** ~1 min · **Severity:** Low

- **Sources:** `mem://architecture/data-type-definitions`, grep across `src/`.
- **Blind-AI likely output:** LLM uses `any` or `unknown` freely. Rules ban it.
- **Actual:** **85 files** import/use one of `SqlValue|JsonValue|CaughtError` — strong adoption.
- **Gap:** No ESLint guard preventing introduction of `JsonValue | undefined` (memory notes "no undefined" in JsonValue) at API boundaries.
- **Recommendation:** Add a custom type-checker test using `tsd` or `expect-type` asserting `undefined extends JsonValue` is `false`, and asserting common Stored shapes don't allow undefined.
