# Spec Audit — Prompt-Macros — 100-Task Phased Plan

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)
**Mode:** DISCOVERY (no fixes). Each `next` = the next un-checked task.
**Output folder:** `spec/21-app/05-prompts/99-spec-issues/`
**Memory:** `mem://audits/spec-prompt-macros`

> Phases are sized so every single `next` call almost certainly succeeds.
> No task touches more than ~3 files; most touch exactly 1.

---

## Phase 0 — Setup (DONE in this turn) — Tasks 1–5

1. [x] Create `99-spec-issues/00-overview.md` (audit headline + category table)
2. [x] Write `99-spec-issues/01-missing-metadata-header.md` (C1)
3. [x] Write `99-spec-issues/02-filename-violations.md` (C2)
4. [x] Write `99-spec-issues/03-missing-overview-files.md` (C3)
5. [x] Write `99-spec-issues/04-missing-consistency-report.md` (C4) + `05-reserved-prefix-misuse.md` (C5)

## Phase 1 — Expand remaining Phase-0 categories — Tasks 6–10

6. [x] Write `06-missing-acceptance-criteria.md` (C6) — list 9 folders, what acceptance each needs.
7. [x] Write `07-snake-case-in-body.md` (C7) — enumerate every metric name + decision (keep Prometheus convention vs PascalCase).
8. [x] Write `08-cross-reference-rot.md` (C8) — grep all `mem://` / relative links in spec, list broken or unresolved.
9. [x] Write `09-plan-doc-leak.md` (C9) — spec links pointing into `.lovable/plans/` (should be self-contained).
10. [x] Write `10-parallel-concept-docs.md` (C10) — `00-concept.md` vs `engine/00-architecture.md` overlap, no `supersedes:` field.

## Phase 2 — Deep dive: structural — Tasks 11–25

11. [x] Grep + write `11-h1-title-mismatch.md` — H1 vs filename slug mismatches.
12. [x] `12-orphan-files.md` — files not linked from any `00-overview.md`.
13. [x] `13-duplicate-headings.md` — repeated H2 across siblings (signals overlap).
14. [x] `14-trailing-whitespace-tabs.md` — lint-style spec hygiene.
15. [x] `15-bare-code-fences.md` — fences missing language hint.
16. [ ] `16-mermaid-vs-ascii-diagrams.md` — guide says ASCII; check compliance.
17. [ ] `17-empty-sections.md` — `## Heading` followed by no content.
18. [ ] `18-todo-fixme-markers.md` — accidental dev markers.
19. [ ] `19-link-anchor-rot.md` — `#section` anchors that don't exist.
20. [ ] `20-image-asset-rot.md` — image refs without assets.
21. [ ] `21-relative-vs-absolute-paths.md` — guide expects spec-relative.
22. [ ] `22-mixed-date-formats.md` — ISO vs other.
23. [ ] `23-mixed-tz-mentions.md` — confirm Asia/Kuala_Lumpur usage.
24. [ ] `24-version-bump-policy.md` — none of the new docs declare semver intent.
25. [ ] `25-changelog-coverage.md` — `98-changelog.md` (after rename) coverage gaps.

## Phase 3 — Deep dive: content correctness — Tasks 26–45

26–35. [ ] One file per engine doc (`engine/00`–`09`): verify against onboarding prompt rubric; produce `26-engine-00-architecture.md` … `35-engine-09-event-stream.md` audit notes.
36–40. [ ] One per `examples/` doc (`36`–`40`).
41–45. [ ] One per `guards/` doc (`41`–`45`).

## Phase 4 — Deep dive: testing & observability — Tasks 46–55

46–50. [ ] One per `testing/` doc.
51–55. [ ] One per `observability/` doc.

## Phase 5 — JSON / UI / Variables — Tasks 56–75

56–65. [ ] One per `json/` doc (`56`–`65`).
66–75. [ ] One per `ui/` doc (`66`–`75`).

## Phase 6 — Macro-prompts folder + variables — Tasks 76–85

76–83. [ ] One per `macro-prompts/00`–`07`.
84–85. [ ] `variables/` deep audit (2 tasks).

## Phase 7 — Cross-cutting & memory — Tasks 86–92

86. [ ] Audit `mem://features/prompt-macros` against engine spec.
87. [ ] Audit `mem://features/prompt-variables` against `variables/`.
88. [ ] Audit `mem://architecture/macro-prompts-folder` against actual folder layout.
89. [ ] Check `.lovable/memory/index.md` references for stale paths.
90. [ ] Audit `READINESS-SCORE.md` claims line-by-line.
91. [ ] Audit `MIGRATION.md` for executability by a blind AI.
92. [ ] Audit `CHANGELOG.md` against actual artifact list.

## Phase 8 — Consolidation — Tasks 93–98

93. [ ] Build `99-spec-issues/90-master-issue-list.md` — flat dedup of all findings.
94. [ ] Build `99-spec-issues/91-severity-matrix.md` — Critical/High/Medium/Low counts.
95. [ ] Build `99-spec-issues/92-fix-effort-estimate.md` — task-count per category.
96. [ ] Build `99-spec-issues/93-blind-ai-failure-modes.md` — what exactly breaks.
97. [ ] Build `99-spec-issues/94-revised-readiness-score.md` — replace the bogus 100/100.
98. [ ] Update `00-overview.md` with final tallies.

## Phase 9 — Close-out — Tasks 99–100

99. [ ] Update `mem://audits/spec-prompt-macros` with full finding list + status=COMPLETE.
100. [ ] Append "Audit complete — ready for fix-pass approval" entry + ask user whether to start the fix pass (separate plan).

---

## Execution rule

Say **`next`** (singular) or **`next N`**. Each task is small enough that `next` reliably succeeds. I will never fix a file during this audit — I only enumerate.
