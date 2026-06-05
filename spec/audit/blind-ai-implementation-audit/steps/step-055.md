# Step 55 — New-tab / no-URL guard

**Timestamp:** 2026-06-02
**Memory:** Core rule + `mem://features/new-tab-no-url-guard` (v2.249.5)

## Reasoning
This is a regression-prone area; an unguarded auto-injector burns CPU and pollutes logs on new-tab churn.

## Findings
- ✅ `src/shared/url-utils.ts` exports `isNewTabOrBlankUrl`; 5 callers grep cleanly (auto-injector, project-matcher, shortcut-command-handler, url-utils test, project-matcher-new-tab-guard test).
- ✅ Dedicated test `project-matcher-new-tab-guard.test.ts`.
- 🟢 **Low**: no test covering `shortcut-command-handler` new-tab path.

## Recommendation
Add 1 unit test asserting `shortcut-command-handler` no-ops on `chrome://newtab/`. Otherwise this rule is in **good shape** — a low-grade LLM will find the helper and reuse it.
