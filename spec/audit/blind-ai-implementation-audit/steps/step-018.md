# Step 18 — Error swallow audit generator

**Time:** ~1 min · **Severity:** Low

- **Sources:** `scripts/audit-error-swallow.mjs`, `public/error-swallow-audit.json`, `mem://features/error-swallow-audit-generator`.
- **Blind-AI likely output:** LLM might re-implement instead of reusing.
- **Actual:** Script + JSON both present; classifier in place; Options panel consumes JSON.
- **Gap:** JSON is committed — risks staleness if generator not run pre-build. Not gated by build-lock or pre-build hook.
- **Recommendation:** Wire `audit-error-swallow` into `scripts/prebuild-clean-and-verify.mjs` behind the build lock; fail build if JSON is older than git HEAD of `src/`.
