---
name: guards-03-new-tab-guard audit
description: Per-doc audit of guards/03-new-tab-guard.md
type: audit
---

# Audit — guards/03-new-tab-guard.md

**Target:** `spec/21-app/05-prompts/macros/guards/03-new-tab-guard.md` (39 lines)
**Audited:** 2026-06-02 (Asia/Kuala_Lumpur)

## Findings

- **C1 Missing metadata header.**
- **C10 Parallel doc** — mirrors `mem://features/new-tab-no-url-guard`; same drift hazard as C43.
- **C8 Reference rot** — cites helper `isNewTabOrBlankUrl()` without spec-relative path; blind AI will not find `src/shared/url-utils.ts`.
- **C7 Enumeration completeness** — URL list (`about:blank`, `chrome://newtab/`, …) should `Mirrors:` the memory so additions propagate.
- **C28 Test pointer missing** — memory says "Test: scripts/__tests__/..."; this doc does not.

## Severity
High. Security guard; enumeration drift = bypass.

## Recommended fix order
1. Add `Mirrors: mem://features/new-tab-no-url-guard` header.
2. Inline helper file path + test path.
3. Metadata header.
