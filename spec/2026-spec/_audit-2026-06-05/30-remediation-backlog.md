# Remediation Backlog — 30 atomic fix-steps

Ranked by (Failure% × file traffic). Each step is one patch a blind AI can apply.

Legend: **target** = file or glob, **patch** = before/after sketch, **proof** = how we verify it landed.

## P0 — Acceptance + determinism (lifts mean score most)

1. **target** `01-prompt-spec/**/*.md` (every file without `## Acceptance`). **patch** append `## Acceptance\n- [ ] <rule 1>\n- [ ] <rule 2>`. **proof** new script `scripts/audit/check-acceptance.mjs` greps for `## Acceptance` + `- [ ]`.
2. **target** `01-prompt-spec/12-delay-engine/*.md`. **patch** wrap every numeric ("5s default") in **MUST** clause and link to `reference/05-runtime-defaults.md`. **proof** rerun `/tmp/audit_scan.py`, determinism ≥ 20.
3. **target** `01-prompt-spec/13-failure-handling/*.md`. **patch** add `## Pitfalls` (≥2 counter-examples). **proof** heuristic pitfalls dim = 15.
4. **target** `02-ci-cd-spec-for-chrome-extensions/05-*.md` … `10-*.md`. **patch** add `- [ ]` acceptance per spec id. **proof** acceptance dim = 20.
5. **target** `03-db-and-sqlite-integration/02-schema*.md`. **patch** inline or link to `schemas/*.schema.json` (currently referenced by name only). **proof** all relative-link checks resolve.

## P1 — Dangling links + thin files

6. Fix every dangling link enumerated in `10-folder-01-prompt-spec.md` (auto-list). **proof** `npx markdown-link-check` (needs new test).
7. Same for `11-folder-02-ci-cd.md`. **proof** same script.
8. Same for `13-folder-03-db-and-sqlite.md`. **proof** same script.
9. **target** every `README.md` / `00-*overview.md` <80 words. **patch** add one-line summary per sibling file. **proof** heuristic words ≥ 80.
10. **target** `01-prompt-spec/01-glossary/*.md`. **patch** ensure every term used downstream is defined here; cross-link. **proof** symbol-defined check.

## P1 — Schema & contract gaps

11. Promote `01-prompt-spec/schemas/*.schema.json` to canonical SOT; add `## Schema` link in every `02-data-model/*.md`. **proof** JSON-schema lint in CI.
12. **target** `01-prompt-spec/04-loader-contract/01-loader-interface.md`. **patch** inline TS `interface PromptLoader { … }`. **proof** test imports the interface from a shared `.d.ts`.
13. **target** `01-prompt-spec/07-editor-adapters/01-adapter-interface.md`. **patch** inline `EditorAdapter` TS interface. **proof** same.
14. **target** every "the host implements X" sentence. **patch** add explicit shape or link. **proof** grep gate in CI.
15. **target** `03-db-and-sqlite-integration/01-overview.md`. **patch** add canonical `Storage` interface and lifecycle diagram. **proof** mermaid renders.

## P2 — Cross-folder consistency

16. Reconcile verbose-logging rules (see `20-cross-folder-gaps.md` §"Conflicting"). **proof** single memory reference everywhere.
17. Reconcile failure-log schema (one shared TS type). **proof** same.
18. Reconcile webhook fail-fast text. **proof** grep both folders cite `mem://constraints/webhook-fail-fast`.
19. Promote "spec files MUST have `## Acceptance`" to Core memory + lint. **proof** new lint script blocks PRs.
20. Add `99-consistency-report.md` per folder where missing (currently only one repo-level file).

## P2 — Coverage of low-scoring tail

21. Re-audit `01-prompt-spec/05-ui-contract` (UX-heavy, low determinism) — split into "behavior" + "visuals" sub-files.
22. Re-audit `01-prompt-spec/17-onboarding` — fold into a single 1-page contract; current 5 files are mostly prose.
23. Re-audit `01-prompt-spec/14-plan-mode` — add explicit state diagram.
24. Re-audit `01-prompt-spec/16-observability` — link to existing `mem://architecture/session-logging-system`.
25. Re-audit `02-ci-cd/13-*.md` … `17-*.md` — they are the lowest in the folder.

## P3 — Machine-check hooks (one PR each)

26. New script `scripts/audit/check-acceptance.mjs` (needs new test).
27. New script `scripts/audit/check-dangling-links.mjs` (needs new test).
28. New script `scripts/audit/check-must-constants.mjs` (needs new test).
29. CI workflow `.github/workflows/spec-audit.yml` running all three on every PR touching `spec/2026-spec/**`. **proof** PR check appears.
30. Wire `/tmp/audit_scan.py` into the repo at `scripts/audit/audit-scan.py` and snapshot results to `spec/2026-spec/_audit-2026-06-05/scores.json` (regen on demand).

## Deferred (require user input)

None as of this audit. If any step above is blocked, append to `.lovable/pending-issues/` per Step 29.
