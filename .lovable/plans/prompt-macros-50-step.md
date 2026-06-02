# Prompt Macros — 100-Step Spec Authoring Plan

**Created:** 2026-06-02 (Asia/Kuala_Lumpur) · **Revised:** 2026-06-02 (expanded 50 → 100, added Variables + Macro-Prompts folder)
**Goal:** Extend the Prompts subsystem with a **Macro** (chained prompt) capability — declarative multi-step prompt sequences that auto-issue `next` keywords, run audits, write gap analysis into `spec/audit/<runId>/`, loop until a target score is met, then write a final report. Also document **prompt Variables / Templating**, a dedicated **Macro-Prompts folder**, **Save / Export / Import / Replace via JSON**, and the Prompts button UX in detail.

This plan is the source of truth. Each `next 10` executes the next un-checked block; tasks are written so a blind AI can execute them in order without further guidance.

---

## Part A — Concept (the "ideas" the user asked for)

### A.1 Macro = ordered chain of typed steps

```
Macro := [ Step₁ → Step₂ → … → Stepₙ ]
Step  := { Kind, PromptSlug?, Variables?, Count?, WriteTo?, Condition?, GotoStep? }
```

Step kinds:

| Kind             | Purpose                                                                       |
|------------------|-------------------------------------------------------------------------------|
| `prompt`         | Render a prompt (with `Variables` interpolated) and inject into the chatbox  |
| `next-loop`      | Emit `next N` keyword repeatedly until `Count` consumed or `Condition` hits   |
| `audit`          | Run audit prompt; writes `spec/audit/<runId>/01-gap-analysis.md` + `02-findings.json` |
| `fix-from-audit` | Inject "fix based on `spec/audit/<runId>/`"; followed by `next-loop`          |
| `final-audit`    | Re-runs audit; writes `99-final-report.md` + numeric `score`                  |
| `loop-if`        | If `score < TargetScore`, jump to `GotoStep` (bounded by `MaxLoops`)          |
| `set-var`        | Mutate macro-scoped variable (e.g. `RunId`, `Counter`)                        |
| `notify`         | Toast / log a milestone                                                       |

### A.2 Variables & Templating (NEW)

Prompts are **templates**. Variables are declared inline with `{{ VarName }}` (Mustache-lite, no logic). A prompt declares its variables in its `info.json`:

```json
{
  "Slug": "audit-spec",
  "Variables": [
    { "Name": "TargetFolder", "Type": "string", "Default": "spec/" },
    { "Name": "Depth",        "Type": "integer", "Default": 3 }
  ]
}
```

The prompt body uses them:

```md
Audit folder {{ TargetFolder }} to depth {{ Depth }}. Score 0–100.
```

When a macro step references this prompt, it supplies values:

```json
{ "Kind": "prompt", "Slug": "audit-spec", "Variables": { "TargetFolder": "spec/21-app", "Depth": 4 } }
```

Resolution order (highest first):
1. Step-level `Variables`
2. Macro-level `Variables` (shared across all steps in the macro)
3. Run-level `Context` (`{{ RunId }}`, `{{ Now }}`, `{{ LoopCount }}`, `{{ LastScore }}`)
4. Prompt `Default`
5. → fail-fast with `Reason="MissingVariable"` + full `VariableContext[]` per repo standard

### A.3 Macro-Prompts in a separate folder (NEW)

To keep generic prompts (used by humans, no variables required) cleanly separated from **macro-only prompts** (template-heavy, always invoked by a macro):

```
standalone-scripts/prompts/                # existing — human-invoked prompts
standalone-scripts/macro-prompts/          # NEW — macro-only template prompts
  001-audit-spec/
    info.json                              # PascalCase, lists Variables[]
    prompt.md                              # body with {{ Placeholders }}
  002-fix-from-audit/
  003-final-score/
standalone-scripts/macros/                 # NEW — macro definitions (.macro.json)
  001-spec-tighten-cycle.macro.json
```

Both folders aggregate at build time (`scripts/aggregate-prompts.mjs` extended) into:

```
chrome-extension/prompts/macro-prompts.json    # union of human prompts
chrome-extension/macros/macros.json             # macro definitions
```

The macro engine resolves a `Slug` by searching macro-prompts first, then regular prompts (deterministic, fail-fast if duplicate).

### A.4 Run model

- `runId = <macroSlug>-<yyyymmdd-HHmmss>` (Asia/Kuala_Lumpur).
- All artifacts under `spec/audit/<runId>/` (created on first write).
- State `{ currentStep, loopCount, lastScore, runId, variables }` persisted in `chrome.storage.local` → survives SW restarts.
- Pause / Resume / Stop in the Prompts panel.
- Each `prompt` step uses existing injector; each `next-loop` reuses the Task Next sequential loop. Sequential fail-fast (per `mem://constraints/no-retry-policy`).

### A.5 Canonical macro JSON

```json
{
  "Slug": "spec-tighten-cycle",
  "Name": "Spec Tighten Cycle",
  "Version": "1.0.0",
  "TargetScore": 100,
  "MaxLoops": 3,
  "Variables": { "SpecRoot": "spec/" },
  "Steps": [
    { "Kind": "prompt",         "Slug": "read-memory" },
    { "Kind": "next-loop",      "Count": 10 },
    { "Kind": "audit",          "Slug": "audit-spec", "Variables": { "TargetFolder": "{{ SpecRoot }}" } },
    { "Kind": "next-loop",      "Count": 5 },
    { "Kind": "fix-from-audit", "AuditDir": "spec/audit/{{ RunId }}/" },
    { "Kind": "next-loop",      "Count": 15 },
    { "Kind": "final-audit",    "WriteTo": "spec/audit/{{ RunId }}/99-final-report.md" },
    { "Kind": "loop-if",        "Condition": "LastScore < TargetScore", "GotoStep": 3 }
  ]
}
```

### A.6 JSON Save / Export / Import / Replace

- **Save** → `<slug>.prompt.json`, `<slug>.macro.json`.
- **Export All** → `prompts-export-<yyyymmdd>.json` = `{ Version, Prompts, MacroPrompts, Macros, Categories }`.
- **Import** → merge by `Slug`; conflict picker (Keep / Use theirs / Rename).
- **Replace** → atomic wipe-and-load with auto-backup to `chrome.storage.local` under `PromptsBackup.<timestamp>`.
- All payloads validated via Ajv against `schemas/{prompt,macro,prompts-bundle}.schema.json`.

### A.7 Prompts Button UX

Trigger 💬 button in chatbox → panel:
- Search · category chips · favorites pinned · prompt list · footer (`+ New`, `Import`, `Export`, `Reseed Defaults`, `🧩 Macros`)
- **Macros tab** inside the same panel: list with ▶ Run / ⏸ Pause / ⏹ Stop / ✎ Edit / ⧉ Duplicate / ⬇ Export / 🗑 Delete
- **Variable prompt dialog**: when a step needs values, show inline form (typed inputs) before injection
- Running banner: sticky, shows `runId`, step X/N, loop M/MaxLoops, last score, ⏸/⏹

---

## Part B — 100 Tasks (executed 10 at a time via `next 10`)

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

### Block 1 — Foundations & Concept Docs (Tasks 1–10)
1. [x] Create `spec/21-app/05-prompts/macros/` with `README.md` (overview + link map to all subsections).
2. [x] Write `spec/21-app/05-prompts/macros/00-concept.md` — copy Part A.1–A.7 verbatim as canonical concept doc.
3. [x] Write `spec/21-app/05-prompts/macros/01-step-kinds.md` — full table per kind: inputs, outputs, error modes, examples.
4. [x] Write `spec/21-app/05-prompts/macros/02-run-model.md` — runId format, Mermaid state diagram, SW-restart resume contract.
5. [x] Write `spec/21-app/05-prompts/macros/03-audit-artifacts.md` — exact files under `spec/audit/<runId>/` with schemas.
6. [x] Write `spec/21-app/05-prompts/macros/04-loop-and-score.md` — score parsing, `TargetScore` gating, `MaxLoops` safety, infinite-loop guard.
7. [x] Write `spec/21-app/05-prompts/macros/05-failure-modes.md` — every error path with mandatory failure-log shape (Reason + ReasonDetail + SelectorAttempts + VariableContext).
8. [x] Write `spec/21-app/05-prompts/macros/06-storage-contract.md` — chrome.storage.local keys, identity-only mapping (no PascalCase migration).
9. [x] Write `spec/21-app/05-prompts/macros/07-permissions-and-scope.md` — host_permissions, write-only-to `spec/audit/`, forbidden paths.
10. [x] Update `spec/21-app/05-prompts/00-all-prompts.md` to list `macros/`, `macro-prompts/`, and `variables/` subsections.

### Block 2 — Variables & Templating Spec (Tasks 11–20)
11. [ ] Create `spec/21-app/05-prompts/variables/` with `README.md`.
12. [ ] Write `spec/21-app/05-prompts/variables/00-overview.md` — why variables exist, when to use them, examples.
13. [ ] Write `spec/21-app/05-prompts/variables/01-syntax.md` — `{{ VarName }}` Mustache-lite, escaping, whitespace rules, forbidden constructs (no logic).
14. [ ] Write `spec/21-app/05-prompts/variables/02-declaration.md` — `info.json` `Variables[]` schema (Name, Type, Default, Description, Required).
15. [ ] Write `spec/21-app/05-prompts/variables/03-resolution-order.md` — 5-tier waterfall (Step → Macro → Run-Context → Default → fail-fast).
16. [ ] Write `spec/21-app/05-prompts/variables/04-types.md` — supported types: string, integer, number, boolean, enum, path; coercion rules.
17. [ ] Write `spec/21-app/05-prompts/variables/05-built-in-context.md` — `RunId`, `Now`, `LoopCount`, `LastScore`, `SpecRoot`, `MacroSlug`.
18. [ ] Write `spec/21-app/05-prompts/variables/06-validation.md` — Ajv schema + failure-log shape on missing/invalid (`Reason="MissingVariable"`, full `VariableContext[]`).
19. [ ] Write `spec/21-app/05-prompts/variables/07-sensitive-masking.md` — variables flagged `Sensitive: true` are masked in logs.
20. [ ] Write `spec/21-app/05-prompts/variables/08-ui-prompting.md` — inline form dialog spec when required variables are unfilled at run-time.

### Block 3 — Macro-Prompts Folder Layout & Build (Tasks 21–30)
21. [ ] Write `spec/21-app/05-prompts/macro-prompts/README.md` — separation rationale, when to add a prompt here vs `prompts/`.
22. [ ] Write `spec/21-app/05-prompts/macro-prompts/00-folder-structure.md` — `standalone-scripts/macro-prompts/<NNN-slug>/{info.json, prompt.md}` convention.
23. [ ] Write `spec/21-app/05-prompts/macro-prompts/01-naming-and-numbering.md` — 3-digit zero-padded sequence, kebab-case slug.
24. [ ] Write `spec/21-app/05-prompts/macro-prompts/02-info-json-schema.md` — PascalCase keys, Variables[], categories, version, isFavorite.
25. [ ] Write `spec/21-app/05-prompts/macro-prompts/03-aggregation-pipeline.md` — extend `scripts/aggregate-prompts.mjs` to emit `chrome-extension/macro-prompts/macro-prompts.json`.
26. [ ] Write `spec/21-app/05-prompts/macro-prompts/04-resolution-order.md` — macro-prompts searched first, fail-fast on duplicate slug across both folders.
27. [ ] Write `spec/21-app/05-prompts/macro-prompts/05-seed-bundle.md` — bundle into SQLite via existing `LoadBundledDefaultPrompts` flow.
28. [ ] Write `spec/21-app/05-prompts/macro-prompts/06-versioning.md` — version hash format `Count-Hash36`, reseed trigger rules.
29. [ ] Write `spec/21-app/05-prompts/macro-prompts/07-starter-pack.md` — list of 5 starter macro-prompts to bundle (audit-spec, fix-from-audit, final-score, gap-analysis, score-extract).
30. [ ] Update `standalone-scripts/macro-controller/diagrams/prompts-pipeline.mmd` — add second Source branch for `macro-prompts/`.

### Block 4 — Macro Definitions Folder & Schemas (Tasks 31–40)
31. [ ] Write `spec/21-app/05-prompts/macros/folder-layout/00-overview.md` — `standalone-scripts/macros/<NNN-slug>.macro.json` convention.
32. [ ] Write `spec/21-app/05-prompts/macros/folder-layout/01-naming.md` — numbering, slug rules, file extension `.macro.json`.
33. [ ] Create `schemas/prompt.schema.json` — JSON-Schema draft-07 for a single prompt with `Variables[]`.
34. [ ] Create `schemas/macro.schema.json` — JSON-Schema for a macro: top-level fields + `Steps[]` discriminated union by `Kind`.
35. [ ] Create `schemas/prompts-bundle.schema.json` — wrapper `{ Version, Prompts, MacroPrompts, Macros, Categories }`.
36. [ ] Create `schemas/variable.schema.json` — variable declaration shape (reused by prompt + macro schemas).
37. [ ] Write `spec/21-app/05-prompts/macros/folder-layout/02-schema-reference.md` — link the 4 schemas with worked examples.
38. [ ] Write `spec/21-app/05-prompts/macros/folder-layout/03-aggregation.md` — extend aggregator to emit `chrome-extension/macros/macros.json`.
39. [ ] Write `spec/21-app/05-prompts/macros/folder-layout/04-starter-macros.md` — 3 starter macros: spec-tighten-cycle, review-and-fix-loop, weekly-spec-audit.
40. [ ] Author `standalone-scripts/macros/001-spec-tighten-cycle.macro.json` as the reference example matching Part A.5.

### Block 5 — Prompts Button UX & Panel Detail (Tasks 41–50)
41. [ ] Write `spec/21-app/05-prompts/ui/00-prompts-button.md` — trigger, anchor, hover/focus states, ARIA combobox, dark-theme tokens (HSL).
42. [ ] Write `spec/21-app/05-prompts/ui/01-panel-layout.md` — ASCII wireframe of search · chips · favorites · list · footer · Macros tab.
43. [ ] Write `spec/21-app/05-prompts/ui/02-filter-and-search.md` — substring + slug + category match, deterministic (no fuzzy), empty-state copy.
44. [ ] Write `spec/21-app/05-prompts/ui/03-categories.md` — category CRUD, ordering, HSL color tokens (dark-only).
45. [ ] Write `spec/21-app/05-prompts/ui/04-favorites.md` — pin-to-top, persistence, cross-tab sync via `marco-prompts-sync` channel.
46. [ ] Write `spec/21-app/05-prompts/ui/05-macros-tab.md` — rows + Run/Pause/Stop/Edit/Duplicate/Export/Delete buttons + running banner anatomy.
47. [ ] Write `spec/21-app/05-prompts/ui/06-macro-builder.md` — step-card editor (add/remove/reorder), per-kind form fields, validation.
48. [ ] Write `spec/21-app/05-prompts/ui/07-run-banner.md` — sticky banner spec: runId, step X/N, loop M/MaxLoops, last score, ⏸/⏹, error pill.
49. [ ] Write `spec/21-app/05-prompts/ui/08-keyboard-shortcuts.md` — keymap (Run macro, Pause, Stop, Open builder); no conflicts with recorder shortcuts.
50. [ ] Write `spec/21-app/05-prompts/ui/09-variable-input-dialog.md` — inline form rendered when step has unfilled required vars; per-Type widgets; submit/cancel; ESC behavior.

### Block 6 — JSON Save/Export/Import/Replace (Tasks 51–60)
51. [ ] Write `spec/21-app/05-prompts/json/00-overview.md` — when to use each op, file-naming conventions.
52. [ ] Write `spec/21-app/05-prompts/json/01-save-single.md` — Save flow (download + clipboard), payload shape, validation.
53. [ ] Write `spec/21-app/05-prompts/json/02-export-all.md` — full-bundle export including MacroPrompts + Macros + Categories, ordering, redaction.
54. [ ] Write `spec/21-app/05-prompts/json/03-import-merge.md` — merge-by-Slug algorithm, conflict UI (Keep / Use theirs / Rename), dry-run preview.
55. [ ] Write `spec/21-app/05-prompts/json/04-replace-atomic.md` — confirm dialog, auto-backup to chrome.storage.local, rollback path.
56. [ ] Write `spec/21-app/05-prompts/json/05-validation-and-errors.md` — Ajv usage, error-surface copy, mandatory failure-log shape.
57. [ ] Write `spec/21-app/05-prompts/json/06-versioning-and-migration.md` — `Version` semantics, forward/backward compat, migrators registry.
58. [ ] Write `spec/21-app/05-prompts/json/07-clipboard-format.md` — single-prompt copy uses same schema as save; round-trip safe.
59. [ ] Write `spec/21-app/05-prompts/json/08-drag-drop-import.md` — drop `.json` file onto Prompts panel triggers import-merge flow.
60. [ ] Write `spec/21-app/05-prompts/json/09-cli-equivalents.md` — `scripts/prompts-export.mjs`, `scripts/prompts-import.mjs`, `scripts/prompts-validate.mjs` contracts.

### Block 7 — Engine Architecture & Persistence (Tasks 61–70)
61. [ ] Write `spec/21-app/05-prompts/macros/engine/00-architecture.md` — modules + Mermaid sequence diagram (panel → background → injector).
62. [ ] Write `spec/21-app/05-prompts/macros/engine/01-state-machine.md` — Idle → Running → Paused → Looping → Done / Failed transitions table.
63. [ ] Write `spec/21-app/05-prompts/macros/engine/02-resume-after-sw-restart.md` — persisted keys, rehydration, max-stale window.
64. [ ] Write `spec/21-app/05-prompts/macros/engine/03-score-extraction.md` — regex(es) for `score: NN/100`, fail-fast fallback.
65. [ ] Write `spec/21-app/05-prompts/macros/engine/04-audit-folder-writer.md` — exact paths, naming, idempotency, collision handling.
66. [ ] Write `spec/21-app/05-prompts/macros/engine/05-variable-interpolator.md` — template engine spec, escaping, error surface.
67. [ ] Write `spec/21-app/05-prompts/macros/engine/06-message-contract.md` — panel ↔ background ↔ injector message shapes (typed, no `unknown`).
68. [ ] Write `spec/21-app/05-prompts/macros/engine/07-concurrency.md` — single-run-per-tab rule, queueing policy, abort semantics.
69. [ ] Write `spec/21-app/05-prompts/macros/engine/08-watchdog.md` — per-step timeout, total-run timeout, infinite-loop watchdog.
70. [ ] Write `spec/21-app/05-prompts/macros/engine/09-event-stream.md` — `MacroEvent` union: StepStarted, StepCompleted, ScoreParsed, LoopEntered, RunFinished, RunFailed.

### Block 8 — Worked Examples & Tests (Tasks 71–80)
71. [ ] Write `spec/21-app/05-prompts/macros/examples/00-spec-tighten-cycle.md` — full worked example matching Part A.5 + expected artifacts list.
72. [ ] Write `spec/21-app/05-prompts/macros/examples/01-review-and-fix-loop.md` — 3-loop cycle with `TargetScore=95`.
73. [ ] Write `spec/21-app/05-prompts/macros/examples/02-export-import-roundtrip.md` — export bundle → import on fresh profile → assertion checklist.
74. [ ] Write `spec/21-app/05-prompts/macros/examples/03-variable-driven-audit.md` — same macro reused for `spec/21-app` and `spec/30-import-export` via Variables.
75. [ ] Write `spec/21-app/05-prompts/macros/examples/04-macro-prompt-authoring.md` — step-by-step: author new macro-prompt with 3 variables, wire into macro.
76. [ ] Write `spec/21-app/05-prompts/macros/testing/00-unit-tests.md` — engine state-machine, score parser, variable interpolator, schema validators.
77. [ ] Write `spec/21-app/05-prompts/macros/testing/01-component-tests.md` — React component tests for builder, run banner, variable dialog (bans lifted 2026-05-25).
78. [ ] Write `spec/21-app/05-prompts/macros/testing/02-e2e-tests.md` — Playwright: run macro, pause/resume, SW-restart resume, loop-if branch, replace-via-JSON, variable dialog.
79. [ ] Write `spec/21-app/05-prompts/macros/testing/03-coverage-targets.md` — minimum coverage thresholds per module.
80. [ ] Write `spec/21-app/05-prompts/macros/testing/04-fixtures.md` — canonical fixture macros + prompts under `tests/fixtures/macros/`.

### Block 9 — Guards, Observability & Failure Diagnostics (Tasks 81–90)
81. [ ] Write `spec/21-app/05-prompts/macros/guards/00-forbidden-writes.md` — never write to `skipped/`, `.release/`, `node_modules/`, `dist/`.
82. [ ] Write `spec/21-app/05-prompts/macros/guards/01-loop-safety.md` — `MaxLoops` enforcement, watchdog, sequential fail-fast.
83. [ ] Write `spec/21-app/05-prompts/macros/guards/02-no-supabase.md` — restate ban; persistence via chrome.storage.local + SQLite only.
84. [ ] Write `spec/21-app/05-prompts/macros/guards/03-new-tab-guard.md` — macros refuse to run when active tab is `isNewTabOrBlankUrl()`.
85. [ ] Write `spec/21-app/05-prompts/macros/guards/04-variable-injection-safety.md` — escape rules to prevent prompt-injection via user-supplied vars.
86. [ ] Write `spec/21-app/05-prompts/macros/observability/00-logging.md` — `RiseupAsiaMacroExt.Logger.error()` usage, run-scoped log file `spec/audit/<runId>/_log.jsonl`.
87. [ ] Write `spec/21-app/05-prompts/macros/observability/01-metrics.md` — counters: macros_run_total, macro_loops_total, macro_failed_total, last_score histogram.
88. [ ] Write `spec/21-app/05-prompts/macros/observability/02-failure-log-schema.md` — full PascalCase shape: Reason, ReasonDetail, StepIndex, MacroSlug, RunId, VariableContext[], SelectorAttempts[].
89. [ ] Write `spec/21-app/05-prompts/macros/observability/03-export-bundle.md` — include macro-run logs in the existing diagnostics ZIP export.
90. [ ] Write `spec/21-app/05-prompts/macros/observability/04-ui-error-surface.md` — banner + toast + inline copy for every failure mode (no swallow).

### Block 10 — Integration, Memory & Final Wiring (Tasks 91–100)
91. [ ] Update `spec/21-app/02-features/misc-features/advanced-automation.md` — cross-link Prompt-Macros as the prompt-layer counterpart to AutomationChain.
92. [ ] Update `spec/21-app/README.md` — add Macros + Variables + MacroPrompts bullets under "Prompts subsystem".
93. [ ] Update `.lovable/memory/index.md` — add Core line: "Prompt Macros write audits ONLY under `spec/audit/<runId>/`; never to `skipped/` or `.release/`. Variables resolve Step → Macro → RunContext → Default → fail-fast." (preserve all existing content).
94. [ ] Create `mem://features/prompt-macros` documenting engine contract + variable resolution order.
95. [ ] Create `mem://features/prompt-variables` documenting `{{ VarName }}` syntax + 5-tier resolution.
96. [ ] Create `mem://architecture/macro-prompts-folder` documenting `standalone-scripts/macro-prompts/` + aggregation.
97. [ ] Write `spec/21-app/05-prompts/macros/CHANGELOG.md` — append "v1.0.0 — initial Prompt Macros + Variables + Macro-Prompts folder spec".
98. [ ] Write `spec/21-app/05-prompts/macros/MIGRATION.md` — how existing prompts opt-in to becoming macro-prompts (add `Variables[]`, move file, rebuild aggregator).
99. [ ] Write `spec/21-app/05-prompts/macros/READINESS-SCORE.md` — re-run blind-AI readiness rubric specifically for this subsystem; target 100/100.
100. [ ] Update `.lovable/plans/prompt-macros-50-step.md` (this file) — mark plan complete, link to all generated artifacts, append final summary table.

---

## Execution rule

Say **`next 10`** and I execute the next un-checked block in one turn, then list remaining items as a flat `1. 2. 3. …` sequence.
