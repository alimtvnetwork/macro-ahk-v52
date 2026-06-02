# Step 9 — `spec/02-coding-guideline-audit.md` freshness

**Time:** ~1 min · **Severity:** Med

- **Sources:** `spec/02-coding-guideline-audit.md`, `02-coding-guideline-audit.json`.
- **Blind-AI likely output:** Would assume audit is current and act on its findings.
- **Actual:** Audit JSON exists alongside MD — implies a generator. No timestamp surfaced in the always-loaded context, no CI gate verifying it ran against current code.
- **Gap:** Stale audit risk. After the recent `id-denylist` work (arr/str/num enabled), the audit may not reflect 99 renames across 26 files.
- **Recommendation:** Add a `scripts/regen-coding-audit.mjs` and a `prebuild` hook (gated by build-lock) to refresh the JSON; assert the MD's "Generated:" line is within 24h in CI.
