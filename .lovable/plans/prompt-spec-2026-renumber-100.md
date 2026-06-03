> **STATUS (2026-06-03):** ✅ EXECUTED. Old `spec/2026-spec/` path references below describe the pre-rename state. Live path is `spec/01-prompt-spec-2026/`. See changelog at `spec/01-prompt-spec-2026/99-spec-issues/200-renumber-baseline.md`.

# Plan — Rename `spec/2026-spec/` → `spec/01-prompt-spec-2026/` and renumber children to dense `01..NN`

**Created:** 2026-06-03 (Asia/Kuala_Lumpur)
**Owner:** Lovable agent
**Trigger:** User request — "keep nice folder structure inside the 2026 spec; rename root to `01-prompt-spec-2026`; renumber children as 01, 02, 03 sequential; audit & fix every cross-reference; 100-step plan; final blind-AI audit score."
**Memory anchors:** `mem://architecture/spec-organization`, `mem://workflow/file-naming-convention`, `mem://constraints/skipped-folders`.

---

## Target structure

```
spec/01-prompt-spec-2026/
├── 00-overview.md
├── 01-plan-tasks-1-20.md
├── 02-hardening-backlog.md
├── README.md
├── 01-glossary/                       (was 10-glossary)
├── 02-data-model/                     (was 20-data-model)
├── 03-prompt-source-format/           (was 30-prompt-source-format)
├── 04-loader-contract/                (was 40-loader-contract)
├── 05-ui-contract/                    (was 50-ui-contract)
├── 06-injection-contract/             (was 60-injection-contract)
├── 07-editor-adapters/                (was 70-editor-adapters)
├── 08-save-create-edit/               (was 80-save-create-edit)
├── 09-next-overview/                  (was 90-next-overview)
├── 10-queue-model/                    (was 100-queue-model)
├── 11-queue-lifecycle/                (was 110-queue-lifecycle)
├── 12-delay-engine/                   (was 120-delay-engine)
├── 13-failure-handling/               (was 130-failure-handling)
├── 14-plan-mode/                      (was 140-plan-mode)
├── 15-settings/                       (was 150-settings)
├── 16-observability/                  (was 160-observability)
├── 17-onboarding/                     (was 170-onboarding)
├── 18-test-plan/                      (was 180-test-plan)
├── 19-reference-snippets/             (was 190-reference-snippets)
└── 20-adoption-checklist/             (was 200-adoption-checklist)
```

Inner-file numbering inside each child folder stays as-authored (already `00`–`99`).

---

## 100 sequential steps

### Phase A — Discovery & freeze (1–10)
1. Snapshot every file path under `spec/2026-spec/**` → `.lovable/audits/2026-06-03-renumber/inventory-before.txt`.
2. `grep -rIn '2026-spec\|spec/2026-spec' .` → `…/refs-before.txt` (exclude `node_modules`, `.release/`, `skipped/`).
3. Classify references by file type (md / json / ts / html / yml / shell) → `…/refs-classified.csv`.
4. Tag references that point to deep paths (`spec/2026-spec/100-queue-model/...`) vs root-only.
5. Identify scripts that hard-code the dir (`scripts/spec/*.mjs`, `package.json scripts:check:*`).
6. Identify PoC links (`poc/2026-spec/index.html`, `poc/2026-spec/README.md`).
7. Identify audit/back-refs (`spec/audit/blind-ai-implementation-audit/**`).
8. Identify memory & question-log mentions (`.lovable/**`).
9. Write mapping table to `.lovable/audits/2026-06-03-renumber/path-map.json` (oldPath → newPath, all dirs + nested files).
10. Open `99-spec-issues/200-renumber-baseline.md` under target folder for changelog.

### Phase B — Root rename (11–20)
11. `git mv spec/2026-spec spec/01-prompt-spec-2026` (single atomic move).
12. Verify no orphaned siblings (`ls spec/2026-spec` returns ENOENT).
13. Update `spec/01-prompt-spec-2026/README.md` heading + intro paragraph to new path.
14. Update `00-overview.md` self-references.
15. Update `02-hardening-backlog.md` self-references.
16. Update `01-plan-tasks-1-20.md` task IDs that embed the path.
17. Run `lint-cross-refs.mjs` — capture failures (expected ~30).
18. Commit checkpoint marker in changelog (`200-renumber-baseline.md` §1 done).
19. Re-snapshot inventory → `inventory-after-phase-b.txt`.
20. Diff Phase-A vs Phase-B inventory; assert only root prefix changed.

### Phase C — Child folder renames (21–40, one step per folder)
21. `10-glossary` → `01-glossary` (git mv + update internal links).
22. `20-data-model` → `02-data-model`.
23. `30-prompt-source-format` → `03-prompt-source-format`.
24. `40-loader-contract` → `04-loader-contract`.
25. `50-ui-contract` → `05-ui-contract`.
26. `60-injection-contract` → `06-injection-contract`.
27. `70-editor-adapters` → `07-editor-adapters`.
28. `80-save-create-edit` → `08-save-create-edit`.
29. `90-next-overview` → `09-next-overview`.
30. `100-queue-model` → `10-queue-model`.
31. `110-queue-lifecycle` → `11-queue-lifecycle`.
32. `120-delay-engine` → `12-delay-engine`.
33. `130-failure-handling` → `13-failure-handling`.
34. `140-plan-mode` → `14-plan-mode`.
35. `150-settings` → `15-settings`.
36. `160-observability` → `16-observability`.
37. `170-onboarding` → `17-onboarding`.
38. `180-test-plan` → `18-test-plan`.
39. `190-reference-snippets` → `19-reference-snippets`.
40. `200-adoption-checklist` → `20-adoption-checklist`.

### Phase D — Intra-spec cross-reference repair (41–60)
41. Auto-rewrite intra-spec links using `path-map.json` via `scripts/spec/apply-rename-map.mjs` (dry-run first).
42. Manual review of dry-run diff; reject any false positives (e.g. `100` digits unrelated to `100-queue-model`).
43. Apply rewrite for `*.md` files.
44. Apply rewrite for `*.json` schema/index files.
45. Apply rewrite for HTML reference snippets (`19-reference-snippets/`).
46. Rebuild `spec/01-prompt-spec-2026/INDEX.json` (if present) via `scripts/spec/build-index.mjs --root spec/01-prompt-spec-2026`.
47. Rerun `lint-cross-refs.mjs` against new root — must reach 0 hard-fails.
48. Re-run `runbook-smoke.mjs` (unaffected sanity).
49. Update `BLIND-AI-SMOKE-TEST.md` paths.
50. Update `IMPLEMENTATION-CHECKLIST.md` paths.
51. Update `RELEASE-CHECKLIST.md` paths.
52. Update `OWNERSHIP.md`/`CODEOWNERS` paths.
53. Update `CONTRIBUTING.md` paths.
54. Update `GLOSSARY.md` / `ACRONYMS.md` references.
55. Update Mermaid diagrams (`docs/diagrams/*.mmd`) if they cite spec paths.
56. Audit `99-spec-issues/**` for stale path quotes.
57. Audit `macros/**/*.md` for path quotes.
58. Audit `variables/**/*.md`.
59. Audit `ui/**/*.md`.
60. Snapshot fully patched inventory → `inventory-after-phase-d.txt`.

### Phase E — Repository-wide reference repair (61–80)
61. Update `.lovable/question-and-ambiguity/58-2026-spec-scope-placeholders.md` with redirect note.
62. Update `.lovable/question-and-ambiguity/59-2026-spec-folder-name.md` (mark superseded; new decision = Option B executed).
63. Update `.lovable/question-and-ambiguity/readme.md` index entry.
64. Update `.lovable/question-and-ambiguity/task-counter.md`.
65. Update `spec/audit/blind-ai-implementation-audit/final-readiness-report-100.md`.
66. Update `spec/audit/blind-ai-implementation-audit/progress.md`.
67. Update `spec/audit/blind-ai-implementation-audit/steps/step-097.md`.
68. Update `poc/2026-spec/README.md` paths (PoC folder name itself stays — it's code, not spec).
69. Update `poc/2026-spec/index.html` comment headers.
70. Optional: rename `poc/2026-spec` → `poc/01-prompt-spec-2026` only if user confirms (defer; log decision).
71. Update CI workflows `.github/workflows/spec-gates.yml` paths.
72. Update CI workflows `.github/workflows/spec-governance-quarterly.yml`.
73. Update `scripts/spec/build-index.mjs` ROOT constant.
74. Update `scripts/spec/lint-cross-refs.mjs` ROOT constant.
75. Update `scripts/spec/check-perf-budget.mjs` paths.
76. Update `scripts/spec/runbook-smoke.mjs` paths.
77. Update `scripts/spec/build-tooltip-dict.mjs` paths.
78. Update `scripts/spec/smoke-rescore.mjs` paths.
79. Update `scripts/spec/governance-report.mjs` paths.
80. Update `scripts/spec/tooltip-dict-gate.mjs` paths.

### Phase F — Memory, indexes, and tracker hygiene (81–90)
81. Update `mem://architecture/spec-organization` to mention the renumber convention (dense `01..NN`, no gap-10s in `spec/01-prompt-spec-2026/`).
82. Update `mem://workflow/file-naming-convention` with worked example.
83. Append a new memory `mem://workflow/prompt-spec-2026-layout` describing canonical layout.
84. Update `mem://index.md` Core line referencing the new root.
85. Update `spec/21-app/05-prompts/INDEX.json` if it cross-refs.
86. Update `public/spec-tooltips.json` entries that link to old paths.
87. Update `.lovable/plan.md` roadmap entries referencing the spec.
88. Update `.lovable/overview.md` if it references the spec.
89. Update `readme.txt` ONLY if it already cites the path (do not introduce time/clock).
90. Rebuild & commit fresh `INDEX.json`.

### Phase G — Validation, gates, and close-out (91–100)
91. Run full `spec-gates` matrix locally (`perf-budget`, `spec-xref`, `spec-index`, `smoke-rescore`, `runbook-smoke`, `tooltip-dict-gate`) — all green required.
92. Run `npm run lint` (zero warnings policy).
93. Run `vitest run` (unit suite stable).
94. Run `bunx playwright test` smoke (E2E unaffected — sanity only).
95. Diff `inventory-before.txt` ↔ `inventory-after-phase-d.txt` ↔ `inventory-after-phase-g.txt`; assert file count constant.
96. Write `99-spec-issues/201-renumber-closeout.md` with metrics (files moved, refs rewritten, gates passing).
97. Update changelog (`macros/CHANGELOG.md` v2.5.0 entry) noting structural rename only (no semantic change).
98. Update `BLIND-AI-SMOKE-TEST.md` rescore (expect ≥ prior 20/20).
99. Re-run blind-AI scorecard generator → write `99-spec-issues/202-renumber-rescore.md`.
100. Tag plan complete in `.lovable/plans/prompt-spec-2026-renumber-100.md` (this file) and link from `mem://workflow/spec-hardening-waves`.

---

## Risk register

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Regex rewrite collapses `100` digits unrelated to folder names | Constrain rewrite to anchored path prefixes `spec/2026-spec/<NN>-` |
| R2 | Broken external bookmark | Leave a stub `spec/2026-spec/README.md` redirecting (created in Phase B) |
| R3 | CI scripts hard-code root | Phase E touches every script |
| R4 | PoC folder still named `2026-spec` | Step 70 defers; can land in v2 |
| R5 | Memory drift | Phase F refreshes 4 memory files |

---

## Deferred / out of scope

- Renaming inner files (already dense `00`–`NN` per folder).
- Renaming `poc/2026-spec/` (separate decision, step 70).
- Renaming `spec/audit/blind-ai-implementation-audit/` (audit lineage — keep stable).
