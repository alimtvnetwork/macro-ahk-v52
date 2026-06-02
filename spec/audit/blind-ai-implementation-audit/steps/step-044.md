# Step 44 — Step library export bundle

**Time:** ~1 min · **Severity:** Low

- **Sources:** `step-library/export-bundle.ts`, `import-bundle.ts`, `export-error-explainer.ts`, `import-error-explainer.ts`, `schema.ts`.
- **Blind-AI likely output:** LLM would skip schema versioning and error explainers. Existing code is more mature.
- **Actual:** Round-trip pair (export/import) + dedicated error explainers + schema module — very strong.
- **Gap:** No "round-trip" property test (export → import → export → byte-equal) visible.
- **Recommendation:** Add `bundle-round-trip.property.test.ts` using fast-check to fuzz random bundle shapes.
