# Plan SOT Pointer

⚠️ **Roadmap SOT is `/plan.md` at the repo root.** This file holds only the active task-spec for the current `next` cycle.

---

# Task Spec — Drive `spec/2026-spec/` Blind-AI Audit to 100/100 (30 Steps)

**Created:** 2026-06-05
**Owner:** next-loop
**Mode:** **plan only — do not execute in this turn.**
**Starting state:** composite **90.22 / 100** across 229 md files (per `_audit-2026-06-05/99-final-score.md`). 60 files still <90; 0 red.
**Goal:** composite **≥ 99.5 / 100**, **0 files <90**, all 3 CI checks (acceptance / dangling-links / must-constants) plus the audit-scan heuristic green, and a regression-locked snapshot in CI.

## Guidelines applied

- `.lovable/coding-guidelines.md` — present; applies to any script edits (audit scanner, CI checks) made during execution.
- `spec/coding-guidelines/` — missing, skipped silently.
- `.lovable/seo-guidelines.md` — N/A (docs audit, not SEO).
- Core memory rules in force: No-Questions Mode (log ambiguities under `.lovable/question-and-ambiguity/`), `next` convention, no-retry policy, error-logging discipline, readme.txt prohibitions (no time/clock writes), timezone rule (no hardcoded TZ in any new footer text).

## Pending tasks scanned from `.lovable/`

Carried forward (open, not auto-picked):

1. **P Store marketplace workstream** — discuss-later only per `mem://preferences/deferred-workstreams`; do not recommend or auto-plan.

Closed during step 29 sweep:

1. **ws-members-panel.ts:314 TS1002 note** — stale; targeted TypeScript syntax check on the exact file is green. Moved to `.lovable/solved-issues/14-ws-members-panel-ts1002-cleared.md`.
2. **Issue 115 — Workspace label refinement** — already ✅ COMPLETE; moved to `.lovable/solved-issues/15-workspace-label-refinement.md`.

No new pending items were introduced by this plan.

## Ambiguities (logged, non-blocking)

- "reaches to a hundred percent" — interpreted as composite ≥ 99.5 AND 0 files <90 AND all CI checks green. If the user meant literal 100.0 on every file, step 30 verifies and a follow-up plan would extend.
- "take steps I will describe later on" — interpreted as: write the 30 steps now; user may revise before execution.

---

## The 30 Steps

Each step is atomic, has a proof hook (test / script / scorer delta), and lists the files it touches. Steps are ordered by impact-per-effort using the current per-folder gap data.

### Wave A — Topic-aware uplift of remaining stragglers (steps 1–10)

1. **Inventory <90 files.** Run `python3 scripts/audit/audit-scan.py spec/2026-spec --output=/tmp/scores.json`, then emit `/tmp/under90.json` grouped by folder. Proof: file exists, 60 rows.
2. **Per-topic preset for `01-prompt-spec/08-save-create-edit/`** (5 files). MUST: optimistic-update rollback rule, slug-collision policy, soft-delete TTL bound to `reference/05-runtime-defaults.md`. Pitfalls: lost-update on concurrent edit, ZIP re-import duplicate id. Proof: scorer rerun, all 5 files ≥90.
3. **Per-topic preset for `01-prompt-spec/09-next-overview/`** (5 files). MUST: host-submit button detection contract, disabled-button polling cap, interruption-detection event schema, cancel idempotency. Pitfalls: double-fire on focus regain, false-positive interruption on scroll. Proof: scorer ≥90 each.
4. **Per-topic preset for `01-prompt-spec/10-queue-model/` + `11-queue-lifecycle/`** (10 files). MUST: task-shape JSON schema bound, status enum closed-set, ordering tie-breaker, retry-and-hold budget bound to runtime-defaults. Pitfalls: status-skip race, stuck `processing` on tab close. Proof: scorer ≥90 each + `check-must-constants` green.
5. **Per-topic preset for `01-prompt-spec/15-settings/`** (5 files). MUST: settings-schema versioning, default-reset deterministic order, host-override precedence. Pitfalls: stale cache after schema bump, host-override applied to unrelated origin. Proof: scorer ≥90 each.
6. **Per-topic preset for `01-prompt-spec/17-onboarding/` + `18-test-plan/`** (10 files). MUST: first-run idempotency, telemetry opt-in default `false`, test-fixture path conventions, ci-gate names. Pitfalls: tour re-fires after re-install, fixtures drift from schema. Proof: scorer ≥90 each.
7. **Per-topic preset for `01-prompt-spec/19-reference-snippets/` + `20-adoption-checklist/`** (10 files). MUST: snippets compile under TS strict, checklist items map to acceptance criteria. Pitfalls: snippet diverges from contract, checklist references removed file. Proof: scorer ≥90 each + `check-dangling-links` green.
8. **Per-topic preset for `01-prompt-spec/99-spec-issues/` + `reference/` + `ui-reference/`** (5 files). MUST: every issue has resolution-state, every reference page bound to a runtime constant or schema. Proof: scorer ≥90 each.
9. **Per-topic preset for `02-ci-cd-spec` 80–89 stragglers** (6 files). MUST: bare `on: push:` rule, `httpFailFast` reference, no-zips-in-repo, out-of-band tag policy. Pitfalls: branch/path filter regression, `gh release create` with `--draft` skipping workflow. Proof: scorer ≥90 each.
10. **Per-topic preset for `03-chrome-ext-features/audit/` subfolder** (14 files). MUST: each audit references its parent spec file + a machine check, includes a counter-example. Pitfalls: audit-stale-vs-spec, missing namespace logger call. Proof: scorer ≥90 each.

### Wave B — Determinism + acceptance hardening (steps 11–17)

11. **Bind every numeric constant to `reference/05-runtime-defaults.md`.** Run `check-must-constants` in `--report` mode to list every literal lacking citation, patch each. Proof: `check-must-constants` exits 0 with `--strict`.
12. **Add machine-checkable acceptance to every README/overview file** currently using the exempt fallback. Convert "should" → "MUST" with checkbox list. Proof: scorer `acceptance=20` for every file; spot-audit ≥10 files.
13. **Inline JSON Schemas / TS types where referenced but missing.** Scan `01-prompt-spec/02-data-model/` and `10-queue-model/` for "shape" prose without a fenced schema; inline minimal schema. Proof: scorer `determinism` ≥20 each.
14. **Pitfalls + counter-example pass** on every file still scoring `pitfalls=0`. Append at least one `Anti-pattern:` + one `Edge case:` block. Proof: scorer `pitfalls=15` for all files.
15. **Cross-ref repair pass.** Run `check-dangling-links`, patch every dangling target (create stub or relink). Proof: `check-dangling-links` exits 0; scorer `cross_refs=15` for every file with links.
16. **Top-level `spec/2026-spec/README.md` uplift** from 90 → 100. Add deterministic links to all 4 subfolders + machine-check anchor list + per-folder mean table. Proof: scorer = 100.
17. **`_audit-2026-06-05/` self-consistency pass.** Re-run scorer, regenerate `01-aggregate-scoreboard.md`, `99-final-score.md`, `README.md` from `/tmp/scores.json` via a new `scripts/audit/render-reports.mjs`. Proof: regenerated files diff-clean on rerun.

### Wave C — Cross-folder & SOT consolidation (steps 18–22)

18. **Cross-folder duplicate-rule consolidation.** For every rule duplicated across `01-prompt-spec`, `02-ci-cd`, `03-chrome-ext-features`, `03-db-and-sqlite`, pick one canonical owner; other folders link to it. Proof: `20-cross-folder-gaps.md` updated; no duplicate MUST text >120 chars across folders (grep check).
19. **Conflicting-constant resolution.** Diff numeric constants across folders; for any divergence, pick winner in `reference/05-runtime-defaults.md` and patch losers. Proof: new `scripts/audit/check-constant-divergence.mjs` exits 0.
20. **Memory cross-reference.** For every "MUST" added in waves A/B, cite the matching `mem://` entry (or add a TODO in `.lovable/question-and-ambiguity/` if none exists). Proof: grep finds zero un-cited MUSTs in updated files.
21. **Reconcile with `99-consistency-report.md`** files inside each subfolder; update `_audit-2026-06-05/40-reconciliation-with-root-consistency-report.md` with closed/open status per row. Proof: file updated; open count documented.
22. **Quarantine graduation pass** — process ~196 id-denylist files: confirm graduation criteria met, move to active list, or document why deferred. Proof: graduation log appended.

### Wave D — CI lock-in & regression guards (steps 23–28)

23. **Add `scripts/audit/render-reports.mjs`** that consumes `/tmp/scores.json` and writes the 3 report files deterministically (no timestamps). Proof: unit test for renderer in `scripts/__tests__/`.
24. **Add `scripts/audit/check-score-floor.mjs`** — fails if any file <90 or composite <99.5. Proof: passes locally; fails on a planted regression in a test fixture.
25. **Wire all checks into `.github/workflows/spec-audit.yml`:** `audit-scan.py` → `render-reports.mjs` (diff-clean) → `check-score-floor.mjs` → existing acceptance/dangling/must-constants. Upload `scores.json` as artefact. Proof: workflow YAML updated; canary push green.
26. **Add `check-constant-divergence.mjs`** to the workflow (from step 19). Proof: workflow green.
27. **Snapshot lock:** commit `_audit-2026-06-05/scores.snapshot.json`. Workflow diffs current scores vs snapshot; alerts on drop, accepts only when snapshot is updated in same PR. Proof: workflow asserts equality.
28. **No-bare-fetch & footer-lint guards** for new audit scripts (apply `.lovable/coding-guidelines.md` rules: functions ≤8 lines, no `any`, boolean naming). Proof: `npm run lint` clean on changed files; new unit tests in `scripts/__tests__/`.

### Wave E — Final score, sign-off, pending sweep (steps 29–30)

29. ✅ **Pending-issues sweep.** Stale TS1002 note moved to solved after targeted syntax verification; completed workspace-label item moved to solved; only P Store remains deferred with exact path, missing item, and reasoning.
30. ✅ **Final write-up.** Full audit rerun is green: composite 100 / 100, 230 / 230 files ≥90, 230 / 230 files at 100, all wired gates green, and snapshot hash pinned in `_audit-2026-06-05/99-final-score.md` plus root `readme.md`.

---

## Expected scorecard after 30 steps

| Metric | Start | Target |
| --- | --- | --- |
| Composite | 90.22 | **≥ 99.5** |
| Files ≥ 90 | 169 / 229 | **229 / 229** |
| Files < 60 | 0 | **0** |
| CI checks green | 3 / 3 | **6 / 6** (adds score-floor, constant-divergence, snapshot-diff) |

## Execution order note

Steps 1–10 are highest impact (mechanical uplift) and should run in 1–2 batches. Steps 11–17 close the determinism + acceptance long tail. Steps 18–22 prevent score regression via SOT consolidation. Steps 23–28 lock the gains in CI. Steps 29–30 finalize.
