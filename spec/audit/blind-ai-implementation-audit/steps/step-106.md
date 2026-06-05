# Step 106 — Verify S88 (skipped/release CI guard)

**Timestamp:** 2026-06-02

## Verified
`.release` referenced in 4 workflows: `release.yml`, `release-watcher.yml`, `installer-tests.yml`, `ci.yml`. These **consume** `.release/` artifacts but do NOT guard against edits to it.

## Status
🔴 **Confirmed** — no `git diff --exit-code -- skipped/ .release/` step exists in any workflow. Rule is prose-only.

## Recommendation (unchanged)
Add to `ci.yml` early in setup job:
```yaml
- name: Guard read-only folders
  run: |
    if git diff --quiet HEAD~1 -- skipped/ .release/; then echo "OK"; else echo "::error::skipped/ or .release/ modified"; exit 1; fi
```
