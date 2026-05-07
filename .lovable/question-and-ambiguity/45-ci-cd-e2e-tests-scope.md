# 45 — "Add more CI/CD e2e tests to test our features"

**Date (KL):** 2026-05-07
**Mode:** No-Questions (window open).
**Original request:** *"Add more CI CD e2e tests to test our features"*

## Why this is ambiguous

Three plausible meanings:

1. **CI script-level tests** — `node --test` suites under `scripts/__tests__/`
   covering CI gates (`check-version-sync`, `check-changelog-entry`, etc.).
2. **Playwright extension e2e tests** — new specs under `tests/e2e/`.
3. **GitHub Actions workflow integration tests** — running ci.yml against
   synthetic repos via `act` or workflow_dispatch sims.

## Options & trade-offs

| # | Option | Pros | Cons |
|---|--------|------|------|
| A | Add `check-changelog-entry.test.mjs` (script-level) | Directly tests the just-built CI gate. Matches existing `node --test` pattern. <1s runtime. No new tooling. | Doesn't grow Playwright suite. |
| B | New Playwright spec(s) | Exercises real UI. | Conflicts with `mem://preferences/deferred-workstreams`. Slow/flaky. Unclear feature to target. |
| C | Workflow-integration harness | True E2E. | Heavy new tooling, no precedent, overkill. |

## Decision

**Option A.** Recent build added `check-changelog-entry.mjs` with zero
coverage; tests for that script are the highest-value, lowest-risk
addition and align with existing patterns.

## Override

User can say "Run option B" (Playwright) or "Run option C" (workflow harness).
