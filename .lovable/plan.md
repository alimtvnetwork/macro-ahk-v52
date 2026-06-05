# Plan SOT Pointer

⚠️ **Roadmap SOT is `/plan.md` at the repo root.** This file holds only the active task-spec for the current `next` cycle. Do not add roadmap items here.

---

# Task Spec — Blind-AI Audit of `spec/2026-spec/` (30 Steps)

**Created:** 2026-06-05
**Owner:** next-loop
**Scope:** Audit every spec file under `spec/2026-spec/` for blind-AI implementability. Produce a per-file gap analysis and an aggregated score with concrete remediation steps. Mode: **plan only — do not execute in this turn.**

## Goal

A blind AI handed ONLY a single spec file (no codebase, no chat) must be able to implement it correctly. For each file, report:

- **Implementable %** — how much the AI can ship without escalation.
- **Failure %** — how much will silently break or require human input.
- **Top blockers** — ambiguities, missing acceptance, dangling references, missing schemas, undefined identifiers.
- **Score (0–100)** on the 5-dim rubric (clarity 25 / determinism 25 / acceptance 20 / cross-refs 15 / pitfalls 15).
- **Remediation** — exact patches to lift the score to ≥ 90.

## Deliverable Layout

```
spec/2026-spec/_audit-2026-06-05/
├── README.md                  # top-level index + aggregate scoreboard
├── 00-method.md               # rubric, blind-AI protocol, scoring keys
├── 01-aggregate-scoreboard.md # one row per audited file w/ score + %
├── 10-folder-01-prompt-spec.md
├── 11-folder-02-ci-cd.md
├── 12-folder-03-chrome-ext-features.md
├── 13-folder-03-db-and-sqlite.md
├── 20-cross-folder-gaps.md
├── 30-remediation-backlog.md  # 30-step fix queue, ranked by impact
└── 99-final-score.md
```

Per-folder audit file structure: front-matter (folder path, file count, aggregate score) → per-file table → top-10 gaps → recommended patches.

---

## The 30 Steps

**Execution progress:** Steps 1–6 complete (folder audits 01/02/03ext/03db, scoreboard, cross-folder gaps, remediation backlog, final score, README all written 2026-06-05). Composite 50.1/100. Next execution starts at Step 7.

1. Inventory `spec/2026-spec/` — list every `.md`, count files per subfolder, snapshot tree to `00-method.md`.
2. Lock the rubric (5 dims, weights, pass bar = 90) and the blind-AI protocol into `00-method.md`.
3. Create `_audit-2026-06-05/` skeleton with all 9 placeholder files above.
4. Audit `01-prompt-spec/README.md` + each numbered file; score, list gaps, propose patches → `10-folder-01-prompt-spec.md`.
5. Audit `02-ci-cd-spec-for-chrome-extensions/` (00–17 + audit.md + 99). Use existing `audit.md` as prior art — reconcile, do not duplicate → `11-folder-02-ci-cd.md`.
6. Audit `03-chrome-ext-features/README.md` + every `NN-*.md` (01–20). Cross-check against existing per-file audits in `audit/` — flag stale audits → `12-folder-03-chrome-ext-features.md`.
7. Audit `03-db-and-sqlite-integration-with-chrome-extension/` → `13-folder-03-db-and-sqlite.md`.
8. For every spec file, run the 5 blind-AI questions: identifiers defined? schemas present? acceptance machine-checkable? cross-refs resolvable inside the folder? pitfalls + counter-examples shown?
9. Record per-file Implementable % and Failure % in the per-folder tables.
10. Flag every dangling reference (links to files that don't exist, undefined symbols, missing schema paths).
11. Flag every "non-negotiable" rule that lacks an enforcement hook (test, lint, CI gate).
12. Flag every place a numeric constant appears without source-of-truth binding (e.g. timeouts, caps, budgets).
13. Flag every TS type / JSON schema referenced but not inlined or linked to a versioned schema file.
14. Flag every place the spec says "the host implements X" without contract shape.
15. Flag duplicated rules across folders and pick a single owner — record in `20-cross-folder-gaps.md`.
16. Flag conflicting rules across folders (different values for the same constant, etc.) → `20-cross-folder-gaps.md`.
17. Compute aggregate score per folder = weighted mean of per-file scores.
18. Compute repo-wide blind-AI score (`spec/2026-spec/` composite) → `99-final-score.md`.
19. Compute repo-wide Implementable % and Failure % (weighted by file size) → `99-final-score.md`.
20. Write `01-aggregate-scoreboard.md`: one row per file (Path | Score | Impl% | Fail% | Top Blocker).
21. Rank every gap by (Failure% impact × file traffic) into a single backlog → `30-remediation-backlog.md`.
22. For each backlog item, write the exact patch instruction (file, section, before/after) — must be copy-paste-applyable by a blind AI.
23. Group backlog into 30 atomic fix-steps (1 patch = 1 step) so the existing spec-tighten macro can iterate.
24. Add machine-check hooks to `30-remediation-backlog.md`: for each step name the script/test that proves it landed (or "needs new test").
25. Cross-reference every gap against existing memories (`mem://index.md`) — if a rule already exists, cite it; if missing, add a TODO for memory creation.
26. Cross-reference against `spec/99-consistency-report.md` and per-folder `99-consistency-report.md` files — reconcile findings.
27. Validate that `_audit-2026-06-05/README.md` lists every produced file and the aggregate score, with anchor links.
28. Self-audit pass: re-read every produced audit file; confirm rubric applied consistently and no folder skipped.
29. Append `Pending` entry to `.lovable/pending-issues/` if any backlog item is deferred (e.g. requires user input).
30. Final write-up to `99-final-score.md`: aggregate score, top-5 blockers, "fix to reach 100" path, ETA per step.

---

## Guidelines applied

- `.lovable/coding-guidelines.md` — present, will follow during execution.
- `spec/coding-guidelines/` — not present, skipped per rule.
- `mem://index.md` Core rules in force: No-Questions Mode active (log ambiguities to `.lovable/question-and-ambiguity/`), `next` convention, dark-only theme N/A (audit is docs-only), no-retry, error-logging discipline, readme.txt prohibitions (no time/clock writes into `readme.txt`).

## Pending tasks scanned from `.lovable/`

Carried forward (open):

1. **ws-members-panel.ts:314 unterminated string (TS1002)** — pre-existing, blocks `tsc --noEmit` on macro-controller. _(from `.lovable/pending-issues/readme.md`)_
2. **Deferred (do NOT auto-pick):** D1 React component tests, D2 E2E React UI, D3 Prompt Click E2E, D4 P Store, D5 Cross-Project Sync. _(from `05-future-pending-work.md`; honor `mem://preferences/deferred-workstreams`)_

No new pending items from this plan; if step 29 fires, a new entry will be created at execution time.

## Ambiguities (none blocking)

- "Put your gap analysis in thirty step, next thirty step" — interpreted as: write the 30 planning steps now, then execute them as the next 30 `next` iterations. If the user meant "produce 30 separate gap-analysis documents", they can correct on the next turn.
