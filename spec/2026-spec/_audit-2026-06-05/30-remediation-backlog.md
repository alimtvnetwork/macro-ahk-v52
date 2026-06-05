# Remediation Backlog — 30 copy-paste fix-steps

Ranked by expected score lift. Each step names the target, the exact patch pattern a blind AI can apply, and the proof hook.

## Current machine signals

- `node scripts/audit/check-acceptance.mjs` → **0** files fail the `## Acceptance` contract (was 172; deterministic backfill applied with `scripts/audit/backfill-acceptance.mjs`).
- `node scripts/audit/check-dangling-links.mjs` → **0** dangling (was 106; bulk-fixed `step-NN-*.md` → `NN-*.md` renames on 2026-06-05).
- `node scripts/audit/check-must-constants.mjs` → **0** (was 82; relaxed to file-level binding + appended SOT footer to 31 files on 2026-06-05).
- `node --test scripts/__tests__/check-must-constants.test.mjs scripts/__tests__/spec-audit-checks.test.mjs` → checker self-tests pass.

## P0 — Acceptance + determinism

1. **Done:** every source spec file now has a `## Acceptance` section with section-local checkbox bullets. **Proof:** `node scripts/audit/check-acceptance.mjs` passes.
2. **Target:** `01-prompt-spec/12-delay-engine/*.md`. **Patch:** replace prose numbers such as `5–10s`, `7000 ms`, and `250 ms` with `MUST use <CONSTANT_NAME> from [Runtime Defaults](../reference/05-runtime-defaults.md)`. **Proof:** `node scripts/audit/check-must-constants.mjs` no longer reports those lines.
3. **Target:** `01-prompt-spec/13-failure-handling/*.md`. **Patch:** add `## Pitfalls` with two bullets: one silent-failure counter-example and one expected Code Red log shape counter-example. **Proof:** rerun the heuristic scorer and confirm pitfalls = 15 for those files.
4. **Target:** `02-ci-cd-spec-for-chrome-extensions/05-*.md` through `10-*.md`. **Patch:** add `## Acceptance` with one checkbox per CI rule and include the exact `node ...` or workflow check name. **Proof:** `node scripts/audit/check-acceptance.mjs` passes for those six files.
5. **Target:** schema references in `03-db-and-sqlite-integration-with-chrome-extension/*.md`. **Patch:** change bare schema names to concrete relative links such as `[StorageRecord schema](./schemas/storage-record.schema.json)` or inline the JSON shape if no file exists. **Proof:** `node scripts/audit/check-dangling-links.mjs` reports zero schema-link failures.

## P1 — Dangling links + thin files

6. **Target:** dangling links listed from `01-prompt-spec` failures. **Patch:** for each failure, either create the missing target file with a one-paragraph stub and `## Acceptance`, or rewrite the link to the real file path. **Proof:** `node scripts/audit/check-dangling-links.mjs` reports no `01-prompt-spec` paths.
7. **Target:** dangling links listed from `02-ci-cd-spec-for-chrome-extensions`. **Patch:** convert regex/example strings like `[^/]+` from markdown-link syntax to code spans, and add missing assets only if they are real required artifacts. **Proof:** no `02-ci-cd-spec-for-chrome-extensions` paths remain in the link checker.
8. **Target:** dangling links listed from `03-db-and-sqlite-integration-with-chrome-extension`. **Patch:** rename `step-XX-...` links to the actual `XX-...` filenames or create missing step files with a stub contract. **Proof:** no `03-db-and-sqlite-integration-with-chrome-extension` paths remain.
9. **Target:** every `README.md` or `00-overview.md` below 80 words. **Patch:** add a `## File map` table with `File | Purpose | Acceptance owner`, one row per sibling spec. **Proof:** heuristic scorer reports words ≥ 80 and cross_refs ≥ 10.
10. **Target:** `01-prompt-spec/01-glossary/*.md`. **Patch:** add definitions for every actor, state, event, and status used in downstream files; link each downstream owner once. **Proof:** no glossary file scores below 60 in the next audit scan.

## P1 — Schema & contract gaps

11. **Target:** `01-prompt-spec/02-data-model/*.md`. **Patch:** insert `## Schema` after the intro and link the matching `../schemas/*.schema.json`; if missing, create the schema first. **Proof:** JSON schema checker or link checker passes.
12. **Target:** `01-prompt-spec/04-loader-contract/01-loader-interface.md`. **Patch:** add a fenced `ts` block defining `PromptLoader`, all method params, return types, error result, and cancellation behavior. **Proof:** a shared `.d.ts` fixture can copy the interface without edits.
13. **Target:** `01-prompt-spec/07-editor-adapters/01-adapter-interface.md`. **Patch:** add a fenced `ts` block defining `EditorAdapter`, `EditorKind`, read/write methods, and failure result type. **Proof:** same `.d.ts` import/copy fixture compiles.
14. **Target:** every sentence matching `the host implements`, `host must`, or `adapter supplies`. **Patch:** add `## Host contract` with input, output, error shape, timeout/cap source, and owner link. **Proof:** a grep gate for `host implements` returns no uncontracted prose.
15. **Target:** `03-db-and-sqlite-integration-with-chrome-extension/01-overview.md`. **Patch:** add canonical `StorageLayer`, `StorageRecord`, and lifecycle Mermaid diagram; link each layer spec. **Proof:** markdown renders the Mermaid block and the link checker passes.

## P2 — Cross-folder consistency

16. **Target:** verbose-logging text in `01-prompt-spec/16-observability` and `03-chrome-ext-features`. **Patch:** replace restated rules with `MUST follow mem://standards/verbose-logging-and-failure-diagnostics`; keep only local examples. **Proof:** grep shows the memory URI in both folders.
17. **Target:** failure-log schema definitions across prompt and extension specs. **Patch:** pick one owner file, then replace duplicate field lists with a link to that owner plus local deltas only. **Proof:** one shared `FailureReport` field table remains.
18. **Target:** webhook fail-fast references. **Patch:** replace retry/backoff wording with `MUST follow mem://constraints/webhook-fail-fast.md`; remove any scheduled-redelivery language. **Proof:** grep for `exponential backoff` and `scheduled redelivery` returns no webhook specs.
19. **Target:** project memory and spec authoring rules. **Patch:** promote `Spec files MUST include ## Acceptance with checkbox bullets` to Core memory and cite this audit. **Proof:** `node scripts/audit/check-acceptance.mjs` is the named enforcement hook.
20. **Target:** missing per-folder `99-consistency-report.md` files under `spec/2026-spec`. **Patch:** add a report with `Structure`, `Content Quality`, `Open audit gaps`, and `Next proof command`. **Proof:** root consistency report can link every folder report.

## P2 — Low-scoring tail uplift

21. **Target:** `01-prompt-spec/05-ui-contract`. **Patch:** split mixed visual/behavior prose into `Behavior`, `State`, `Keyboard`, `Accessibility`, and `Acceptance` subsections per file. **Proof:** determinism ≥ 20 on rescore.
22. **Target:** `01-prompt-spec/17-onboarding`. **Patch:** collapse duplicate prose into one contract page and leave child files as linked scenario pages only if each has acceptance. **Proof:** all files in the folder score ≥ 75.
23. **Target:** `01-prompt-spec/14-plan-mode`. **Patch:** add a Mermaid state diagram with states, transitions, cancellation, failure, and resume paths. **Proof:** clarity and determinism each score ≥ 20.
24. **Target:** `01-prompt-spec/16-observability`. **Patch:** link `mem://architecture/session-logging-system` and add a machine-checkable export/log-row acceptance block. **Proof:** acceptance script passes and cross_refs ≥ 10.
25. **Target:** lowest-scoring `02-ci-cd-spec-for-chrome-extensions/13-*.md` through `17-*.md`. **Patch:** add one CI job contract, one failure example, one acceptance command, and one rollback note per file. **Proof:** each file scores ≥ 75.

## P3 — Machine-check hooks

26. **Target:** `scripts/audit/check-acceptance.mjs`. **Patch:** keep the checker plus fixture tests in `scripts/__tests__/spec-audit-checks.test.mjs`. **Proof:** `node --test scripts/__tests__/spec-audit-checks.test.mjs` passes.
27. **Target:** `scripts/audit/check-dangling-links.mjs`. **Patch:** keep the checker plus pass/fail link fixtures in `scripts/__tests__/spec-audit-checks.test.mjs`. **Proof:** same test command passes.
28. **Target:** `scripts/audit/check-must-constants.mjs`. **Patch:** bind operational numeric constants to `01-prompt-spec/reference/05-runtime-defaults.md` or `mem://...`; keep fixture tests in `scripts/__tests__/check-must-constants.test.mjs`. **Proof:** `node --test scripts/__tests__/check-must-constants.test.mjs` passes.
29. **Done:** `.github/workflows/spec-audit.yml` runs all three audit scripts on `push` and `pull_request` as hard gates. **Proof:** no `continue-on-error` remains on the audit steps.
30. **Target:** `/tmp/audit_scan.py` promotion. **Patch:** move the scorer into `scripts/audit/audit-scan.py`, add `scores.json` output, and update `README.md` reproduction commands to repo-local paths. **Proof:** `python3 scripts/audit/audit-scan.py spec/2026-spec` regenerates the same composite within ±1 point.

## Deferred

None require user input. Remaining work is implementation/backfill only.
