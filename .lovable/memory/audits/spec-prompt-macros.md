---
name: spec-prompt-macros-audit
description: Active self-audit of spec/21-app/05-prompts/; structural violations vs spec-authoring-guide; do not fix until audit complete
type: feature
---

# Audit — `spec/21-app/05-prompts/` (Prompt-Macros subsystem)

**Started:** 2026-06-02 (Asia/Kuala_Lumpur)
**Status:** ACTIVE — discovery phase. Do not fix any file until audit closes.
**Plan:** `.lovable/plans/spec-prompt-macros-audit-100.md` (100 tasks, executed via `next`)
**Issue folder:** `spec/21-app/05-prompts/99-spec-issues/`

## Confirmed structural issues (Phase 0)

| ID  | Category                                            | Severity | Count |
|-----|-----------------------------------------------------|---------:|------:|
| C1  | Missing mandatory metadata header                   | Critical | 95/95 |
| C2  | Filename violates kebab-case / NN-prefix            | Critical | 6     |
| C3  | Folder missing `00-overview.md`                     | Critical | 9     |
| C4  | Root missing `99-consistency-report.md`             | High     | 1     |
| C5  | Reserved-prefix file in wrong slot                  | High     | 3     |
| C6  | `97-acceptance-criteria.md` missing per folder      | High     | 9     |
| C7  | snake_case identifiers in body (Prometheus metric names) | Medium | 1+ |
| C8  | Cross-reference rot (`mem://` links inside spec)    | Medium   | TBD   |
| C9  | Plan doc in `.lovable/plans/` linked as authoritative from spec | Medium | 2 |
| C10 | Parallel "concept" docs without supersedes chain    | Medium   | 2     |

## Revised readiness for blind AI

- Earlier self-score (`macros/READINESS-SCORE.md`) of **100/100** is INVALID — it ignored structural conformance.
- Realistic blind-AI readiness: **≈ 35 / 100** (content rich, scaffolding broken).

## Rules for this audit

1. **No code or non-issue spec file may be modified** during the discovery phase.
2. Every `next` adds exactly one issue file or extends one section.
3. Findings flow: discover → write `99-spec-issues/NN-…md` → update this memory.
4. Categories may grow (C11+) as deeper passes find more.
5. Audit closes only when the user explicitly says so.

## Cross-refs

- Guide: `spec/01-spec-authoring-guide/02-naming-conventions.md`
- Last spec written: `spec/21-app/05-prompts/macros/**`
- Original 100-step (build) plan: `.lovable/plans/prompt-macros-50-step.md`
