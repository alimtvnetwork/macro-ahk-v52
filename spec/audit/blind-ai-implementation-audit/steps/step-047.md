# Step 47 — Data source parsers

**Time:** ~1 min · **Severity:** Low

- **Sources:** `data-source-parsers.ts`, `data-source-persistence.ts`, `__tests__/data-source-parsers.test.ts`, `data-source-extended.test.ts`, plus `step-library/csv-mapping.ts`, `csv-parse.ts`.
- **Blind-AI likely output:** LLM would invent a JSON-only parser. Real impl supports CSV + extended formats.
- **Actual:** Two test files (parsers + extended) + dedicated CSV mapping/parse — coverage is broad.
- **Gap:** No fuzz test for malformed CSV (BOM, CRLF inside quoted field, escaped quotes).
- **Recommendation:** Add `csv-parse.malformed.test.ts` with the 3 edge cases above.
