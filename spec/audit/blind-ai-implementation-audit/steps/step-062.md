# Step 62 — Versioning policy unified

**Timestamp:** 2026-06-02
**Core rule:** Versioning unified across manifest, constants.ts, scripts
**Memory:** `mem://workflow/versioning-policy` + `mem://workflow/automated-version-validation`

## Reasoning
Version drift between `manifest.json` ↔ `constants.ts` ↔ release scripts produces silent install failures.

## Findings
- ✅ `scripts/check-manifest-version.mjs` + `scripts/bump-version.mjs` present.
- 🟡 **Med**: no single-source-of-truth file referenced — `bump-version.mjs` mutates multiple files; a blind LLM editing one will pass type check but break sync at install time.
- 🟢 **Low**: no test asserting `bump-version` is idempotent.

## Recommendation
Establish one canonical `VERSION` constant and have other locations re-export from it.
