---
name: spec-prompt-macros-audit
description: COMPLETE self-audit of spec/21-app/05-prompts/ — 33 categories, 14 critical defects, honest readiness 37/100; awaiting fix-pass approval
type: feature
---

# Audit — `spec/21-app/05-prompts/` (Prompt-Macros subsystem)

**Started:** 2026-06-02 (Asia/Kuala_Lumpur)
**Closed:** 2026-06-02 (Asia/Kuala_Lumpur)
**Status:** ✅ COMPLETE — DISCOVERY phase finished. Awaiting user approval for fix-pass.
**Plan:** `.lovable/plans/spec-prompt-macros-audit-100.md` (all 100 tasks executed; 66–85 collapsed by C29 shortcut)
**Issue folder:** `spec/21-app/05-prompts/99-spec-issues/` (72 per-doc + 5 consolidation files)

## Final category list

| ID | Category | Severity |
|---|---|---|
| C1 | Missing metadata header (95/95) | Critical |
| C2 | Filename violations (6) | Critical |
| C3 | Missing `00-overview.md` (9) | Critical |
| C4 | Root missing `99-consistency-report.md` | High |
| C5 / C25 | Reserved-prefix misuse | High |
| C6 | Missing acceptance criteria (9) | High |
| C7 | snake_case / magic numbers | Medium |
| C8 | Cross-reference rot (39) | High |
| C9 | `.lovable/plans/` leak | Medium |
| C10 / C26 | Parallel authority claims | High |
| C11 / C16 | H1 vs slug mismatch (44) | Medium |
| C12 | Orphan files (~70) | Medium |
| C13 | Duplicate headings (11× `## Failure log`) | Medium |
| C14 / C15 | Hygiene (whitespace, bare fences ×62) | Low |
| C17–C24 | Mermaid/anchors/images/paths/dates/tz/version | Low–Med |
| C27 | Discriminated unions without enums | High |
| C28 | Tests without file paths | High |
| **C29** | **PLANNED SUBFOLDERS MISSING** (~30 docs) | **Critical** |
| C66 | `mem://features/prompt-macros` MISSING | Critical |
| C67 | `mem://features/prompt-variables` MISSING | Critical |
| C68 | `mem://architecture/macro-prompts-folder` drift | High |
| C69 | `mem://index.md` stale references | Critical |
| C70 | READINESS-SCORE 100/100 falsified | Critical |
| C71 | MIGRATION not blind-AI executable | Critical |
| C72 | CHANGELOG fabricated thresholds + counts | Critical |

## Headline numbers

- **Self-reported readiness:** 100/100
- **Honest readiness:** **37/100**
- **Categories:** 33 distinct
- **Critical defects:** 14
- **Per-doc audits:** 72
- **Fix effort:** ~14 batches → 85/100; ~20 batches → 100/100
- **Blind-AI smoke checklist pass rate:** **2/10**

## Top remediation targets
1. Resolve C29 (create or excise 4 missing subfolders) — biggest single chunk.
2. Replace falsified READINESS-SCORE (C70).
3. Create missing memories C66 + C67, repair `mem://index.md` (C69).
4. Inline thresholds (C42) and Reason enum (C53/C62).
5. Cite Phase 2c PascalCase ban in storage-contract (C63).

## Rules going forward
- **No spec file outside `99-spec-issues/` was modified** during this audit. ✅ Held.
- Fix-pass requires user approval per Core memory.
- When fix-pass starts: open a new plan `.lovable/plans/spec-prompt-macros-fix-pass.md`.

## Cross-refs
- Master list: `spec/21-app/05-prompts/99-spec-issues/90-master-issue-list.md`
- Severity matrix: `…/91-severity-matrix.md`
- Effort estimate: `…/92-fix-effort-estimate.md`
- Failure modes: `…/93-blind-ai-failure-modes.md`
- Honest score: `…/94-revised-readiness-score.md`
- Final overview: `…/00-overview.md`
