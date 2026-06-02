# Blind-AI Spec Remediation Plan — 50 Steps

**Goal:** Take spec from ~60% blind-LLM implementation ceiling → 200% (i.e., comprehensive, unambiguous, generic so any AI can implement).

**Source:** Findings in `progress.md` (Batches 1–11, steps 1–110).

**Execution:** User says "next 10" → AI executes 10 sequential steps. Each step = one concrete fix (file write, doc update, script, CI guard, or memory correction). Steps are atomic and verifiable.

**Numbering is stable.** Do not renumber.

---

## Batch A (Steps 1–10) — Single Source of Truth & Top-Severity Drift

1. **S81 fix** — Collapse plan SOT: turn `.lovable/plan.md` into a 1-line pointer to root `plan.md`. Mirror in `mem://workflow/planning-roadmap`.
2. **S97 fix** — Update `mem://architecture/spec-organization` from "00–08" → actual range (00–32). Add a `scripts/audit-spec-range.mjs` that re-derives range from `ls spec/`.
3. **S96 fix** — Update `mem://performance/idle-loop-audit-2026-04-25`: mark PERF-1 (hot-reload prod) RESOLVED with file pointer to `hot-reload.ts` dev-gate.
4. **S27 fix** — Reconcile OPFS: edit `mem://architecture/session-logging-system` to remove "OPFS (7-day prune)" claim OR add TODO marker. Add a one-line truth statement: "Logs = SQLite only; OPFS = not implemented."
5. **S98 fix** — Update `mem://preferences/deferred-workstreams`: explicitly enumerate that ONLY P Store is deferred; React-test ban + manual-Chrome ban LIFTED 2026-05-25 with date stamp.
6. **S93 fix** — Reconcile Phase 2b vs Phase 2c naming: pick ONE canonical phase label, update both `mem://architecture/instruction-dual-emit-phase-2b` and CI comments.
7. **S5/S6/S89/S95 fix part 1** — Create `spec/00-what-to-read-first.md` (entry point for blind LLM): ordered reading list (plan.md → coding-guidelines → 17-consolidated → memory index → strictly-avoid).
8. **S82 fix** — Consolidate suggestions: pick one canonical path (`.lovable/memory/suggestions/`), add README in others pointing to it. Update `mem://workflow/suggestions-convention`.
9. **S83 fix** — Rename duplicate `01-`/`02-` prefixes in `.lovable/question-and-ambiguity/`; create the missing `README.md` required by Core rule.
10. **Batch A wrap** — Append Batch A summary to `progress.md`; verify all 9 fixes with `ls`/`grep`.

## Batch B (Steps 11–20) — Coding Guidelines Coverage Gap (S5/S90/S95)

11. Inventory `spec/17-consolidated-guidelines/` files → list to `spec/audit/blind-ai-implementation-audit/coverage-inventory.md`.
12. Inventory `.lovable/coding-guidelines.md` sections → same file.
13. Compute diff (% covered) → write `coverage-gap.md` with missing rule list.
14. Expand `.lovable/coding-guidelines.md` part 1: add CQ rules (CQ14 braces, CQ15 newlines, defensive access).
15. Expand part 2: error-handling contract (CaughtError, Logger.error namespace, no swallowed errors, exact path/missing-item/reason on file errors).
16. Expand part 3: type-safety (no `unknown` except CaughtError, fully-typed params, `declare global {}`).
17. Expand part 4: naming (SCREAMING_SNAKE_CASE prefixes ID_/SEL_/ATTR_/CSS_, no short `val/fn/cb/el/msg/ctx/obj`).
18. Expand part 5: storage & auth (no Supabase, no PascalCase storage migration, single `getBearerToken()` contract).
19. Expand part 6: testing (test-with-features mandate, manual Chrome lifted, React-component-tests lifted).
20. Build `scripts/check-coding-guidelines-coverage.mjs` (S95): fails CI if `.lovable/coding-guidelines.md` < 95% of `spec/17-consolidated-guidelines/` headings. Wire into CI.

## Batch C (Steps 21–30) — Logging Compliance (S13 / 11% → 100%)

21. Enumerate all 24 `console.error` files → `audit/logging-sweep-targets.md`.
22. Sweep files 1–4: `console.error` → `RiseupAsiaMacroExt.Logger.error()`.
23. Sweep files 5–8.
24. Sweep files 9–12.
25. Sweep files 13–16.
26. Sweep files 17–20.
27. Sweep files 21–24.
28. Add ESLint rule `no-restricted-syntax` banning `console.error` outside `Logger` implementation file. Add test.
29. Add `scripts/audit-logger-compliance.mjs` mirroring `audit-error-swallow.mjs`; emit `public/logger-compliance-audit.json`.
30. Update `mem://standards/error-logging-via-namespace-logger.md` with compliance % and CI gate reference.

## Batch D (Steps 31–40) — CI Guards & Audit Scripts

31. **S88** — Add `.github/workflows/readonly-paths-guard.yml`: fails PR if any file under `skipped/` or `.release/` is added/modified.
32. **S88 part 2** — Add `.gitattributes` marking `skipped/**` and `.release/**` as `linguist-vendored` + diff suppression; doc the guard in `spec/02-architecture/readonly-folders.md`.
33. **S77** — Add `preinstall` script in `package.json` blocking `framer-motion` and `gsap` (memory: dark-only, zero-external-anim libs).
34. **S60** — Build `scripts/audit-timer-teardown.mjs`: greps setInterval/setTimeout/MutationObserver/addEventListener, requires paired teardown; writes `public/timer-teardown-audit.json`.
35. Wire timer-teardown audit into CI; add unit test under `scripts/__tests__/`.
36. **S91** — Make swallow baseline monotonic: add `scripts/check-swallow-baseline-monotonic.mjs`; fail CI if baseline grows.
37. **S94** — Add runtime validators for namespace DB: enforce 25-cap and `System.*` reservation in `createNamespaceDatabase()`; add unit test.
38. **S85** — Enforce readiness reports: pre-commit hook checks new features include a readiness-report markdown.
39. **S86** — Add README structure linter: each `spec/*/` dir requires `README.md` with H1 + Overview + Files sections.
40. **S84** — Create `.lovable/templates/next-response.md` skeleton (task-tracker friendly response shape).

## Batch E (Steps 41–50) — Genericization & Final Hardening

41. Audit spec for project-specific identifiers (`RiseupAsiaMacroExt`, workspace names, URLs); list to `genericization-targets.md`.
42. Replace project-specific names in `spec/17-consolidated-guidelines/` with `<NAMESPACE>` placeholders + glossary mapping in `spec/00-glossary.md`.
43. Genericize `spec/00-what-to-read-first.md` so any AI on any Chrome-extension project can use it.
44. Add `spec/01-quickstart-for-blind-ai.md`: 10-bullet "if you only read one file" guide.
45. Add `spec/02-non-negotiables.md`: hard bans (Supabase, storage migration, retry/backoff, readme.txt auto-write, CI notifications, dark-only).
46. Add `spec/03-decision-tree.md`: flowchart "user asks X → read Y → apply rule Z".
47. Add `spec/04-failure-modes.md`: catalog of past LLM mistakes + how to avoid (recurring drifts S5/S6/S27/S81/S95/S97).
48. Memory hygiene sweep: re-read `mem://index.md`, remove stale entries, add cross-refs to new spec files (S00–S04).
49. End-to-end blind-LLM dry-run: simulate a fresh AI reading only `spec/00-04` + memory index; document blockers in `dry-run-report.md`.
50. Final verification: re-score subsystem ceilings from Step 100, compare before/after, publish `final-readiness-report.md` with target 95%+ across all subsystems.

---

## Remaining items after this plan

- Pre-existing backlog: Priority 0.1 questions · 0.8 short-name refactor · Cross-Project Sync · P Store (deferred)
- Any new findings surfaced during dry-run (Step 49)
