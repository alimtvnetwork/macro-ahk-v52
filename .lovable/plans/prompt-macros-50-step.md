# Prompt Macros — 50-Step Spec Authoring Plan

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)
**Goal:** Extend the Prompts subsystem with a **Macro** (chained prompt) capability — declarative multi-step prompt sequences that auto-issue `next` keywords, run audits, write gap analysis into `spec/audit/<run-id>/`, loop until a target score is met, then write a final report. Also document **Save / Export / Import / Replace via JSON** and detail the Prompts button UX, filters, categories, favorites.

This plan is the source of truth. Each `next 10` executes the next block; tasks are written so a blind AI can execute them in order without further guidance.

---

## Part A — Macro Concept (the "ideas" the user asked for)

A **Prompt Macro** is a saved, ordered chain of prompt invocations + control directives. Conceptually:

```
Macro := [ Step₁ → Step₂ → … → Stepₙ ]
Step  := { kind, prompt?, repeat?, until?, writeTo?, scoreGate? }
```

Step kinds:

| Kind            | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| `prompt`        | Inject a named prompt (by `slug`) into the chatbox and submit          |
| `next-loop`     | Emit `next N` keyword repeatedly until `N` steps consumed or `until` hits |
| `audit`         | Inject the audit prompt; output is **written to `spec/audit/<runId>/`** as `01-gap-analysis.md`, `02-findings.json` |
| `fix-from-audit`| Inject "fix the spec based on `spec/audit/<runId>/`" prompt; loops via `next-loop` for X steps |
| `final-audit`   | Re-runs audit; writes `99-final-report.md` + numeric `score` (0–100)    |
| `loop-if`       | If `score < target`, jump back to `audit` (bounded by `maxLoops`)       |
| `notify`        | Toast / log a milestone                                                 |

**Run model:**
- A macro run gets a `runId = <macroSlug>-<yyyymmdd-HHmmss>`.
- All artifacts land under `spec/audit/<runId>/` (created on first write).
- The macro engine maintains state: `{ currentStep, loopCount, lastScore, runId }` in `chrome.storage.local` so it survives SW restarts.
- Pause / Resume / Stop controls in the Prompts panel.
- Each `prompt` step uses the existing prompt-injector; each `next-loop` step relies on the existing **Task Next** sequential loop (no parallelism — fail-fast per memory rule).

**JSON shape (canonical, PascalCase per repo convention):**

```json
{
  "Slug": "spec-tighten-cycle",
  "Name": "Spec Tighten Cycle",
  "Version": "1.0.0",
  "TargetScore": 100,
  "MaxLoops": 3,
  "Steps": [
    { "Kind": "prompt",         "Slug": "read-memory" },
    { "Kind": "next-loop",      "Count": 10 },
    { "Kind": "audit",          "WriteTo": "spec/audit/{runId}/" },
    { "Kind": "next-loop",      "Count": 5 },
    { "Kind": "fix-from-audit", "AuditDir": "spec/audit/{runId}/" },
    { "Kind": "next-loop",      "Count": 15 },
    { "Kind": "final-audit",    "WriteTo": "spec/audit/{runId}/99-final-report.md" },
    { "Kind": "loop-if",        "Condition": "score < TargetScore", "GotoStep": 2 }
  ]
}
```

**Save / Export / Import / Replace via JSON (user-requested, must be in spec):**
- **Save** → single prompt or single macro as `<slug>.prompt.json` / `<slug>.macro.json`.
- **Export All** → `prompts-export-<yyyymmdd>.json` containing `{ prompts:[], macros:[], categories:[], version }`.
- **Import** → merge by `Slug`; conflicts surface a 3-way picker (Keep mine / Use theirs / Rename).
- **Replace** → atomic wipe-and-load (with confirm + automatic backup written to `chrome.storage.local` under `PromptsBackup.<timestamp>`).
- All JSON validated against `schemas/prompt.schema.json` and `schemas/macro.schema.json` (Ajv); failures are user-visible (no swallow — per `mem://standards/error-logging-requirements`).

**Prompts Button UX (must be documented in detail):**
- Trigger: 💬 button in the chatbox toolbar.
- Panel: search box → category filter chips → favorites pinned → list → footer actions (`+ New`, `Import`, `Export`, `Reseed Defaults`, `🧩 Macros`).
- Macros tab inside the same panel: list of macros with ▶ Run / ⏸ Pause / ⏹ Stop / ✎ Edit / ⧉ Duplicate / ⬇ Export / 🗑 Delete.
- Running state: sticky banner shows `runId`, current step, loop N/MaxLoops, last score.

---

## Part B — 50 Tasks (executed 10 at a time via `next 10`)

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

### Block 1 — Foundations & Concept Docs (Tasks 1–10)
1. [ ] Create directory `spec/21-app/05-prompts/macros/` with `README.md` (overview + link map).
2. [ ] Write `spec/21-app/05-prompts/macros/00-concept.md` — copy Part A of this plan verbatim as the canonical concept doc.
3. [ ] Write `spec/21-app/05-prompts/macros/01-step-kinds.md` — table of every step kind with inputs, outputs, error modes.
4. [ ] Write `spec/21-app/05-prompts/macros/02-run-model.md` — runId format, state machine diagram (Mermaid), SW-restart resume contract.
5. [ ] Write `spec/21-app/05-prompts/macros/03-audit-artifacts.md` — exact files written under `spec/audit/<runId>/` and their schemas.
6. [ ] Write `spec/21-app/05-prompts/macros/04-loop-and-score.md` — score parsing rules, `TargetScore` gating, `MaxLoops` safety, fail-fast on infinite-loop suspicion.
7. [ ] Write `spec/21-app/05-prompts/macros/05-failure-modes.md` — every error path with mandatory failure-log shape (Reason + ReasonDetail + SelectorAttempts + VariableContext).
8. [ ] Write `spec/21-app/05-prompts/macros/06-storage-contract.md` — chrome.storage.local keys, identity-only mapping (no PascalCase migration — per `mem://constraints/no-storage-pascalcase-migration`).
9. [ ] Write `spec/21-app/05-prompts/macros/07-permissions-and-scope.md` — host_permissions, file-write boundaries (only `spec/audit/`), forbidden write paths (`skipped/`, `.release/`).
10. [ ] Update `spec/21-app/05-prompts/00-all-prompts.md` index to list the new `macros/` subdir and append a "Macros" section header.

### Block 2 — Prompts Button UX & Detailed UI Spec (Tasks 11–20)
11. [ ] Write `spec/21-app/05-prompts/ui/00-prompts-button.md` — trigger, anchor, hover/focus states, keyboard shortcut (Ctrl+Alt+P sibling), accessibility (ARIA combobox).
12. [ ] Write `spec/21-app/05-prompts/ui/01-panel-layout.md` — ASCII wireframe of search · filter chips · favorites · list · footer · Macros tab.
13. [ ] Write `spec/21-app/05-prompts/ui/02-filter-and-search.md` — substring + slug + category match, fuzzy off (deterministic), empty-state copy.
14. [ ] Write `spec/21-app/05-prompts/ui/03-categories.md` — category CRUD, ordering, color tokens (HSL only, dark-only theme per `mem://preferences/dark-only-theme`).
15. [ ] Write `spec/21-app/05-prompts/ui/04-favorites.md` — pin to top behavior, persistence, cross-tab sync via existing `marco-prompts-sync` channel (see `src/hooks/use-prompts.ts`).
16. [ ] Write `spec/21-app/05-prompts/ui/05-macros-tab.md` — list rows, Run/Pause/Stop/Edit/Duplicate/Export/Delete buttons, running banner anatomy.
17. [ ] Write `spec/21-app/05-prompts/ui/06-macro-builder.md` — step-card editor (add/remove/reorder), per-kind form fields, validation rules.
18. [ ] Write `spec/21-app/05-prompts/ui/07-run-banner.md` — sticky banner spec: runId, step X/N, loop M/MaxLoops, last score, ⏸/⏹ controls, error pill.
19. [ ] Write `spec/21-app/05-prompts/ui/08-keyboard-shortcuts.md` — keymap (Run macro, Pause, Stop, Open builder); no conflicts with existing recorder shortcuts (`mem://features/recorder-keyboard-shortcuts`).
20. [ ] Write `spec/21-app/05-prompts/ui/09-error-states.md` — banner / toast / inline copy for every failure mode (no swallow).

### Block 3 — JSON Save/Export/Import/Replace (Tasks 21–30)
21. [ ] Create `schemas/prompt.schema.json` — JSON-Schema draft-07 for a single prompt (PascalCase, with camelCase aliases marked deprecated).
22. [ ] Create `schemas/macro.schema.json` — JSON-Schema for a macro, including `Steps[]` discriminated union by `Kind`.
23. [ ] Create `schemas/prompts-bundle.schema.json` — wrapper `{ Version, Prompts, Macros, Categories }`.
24. [ ] Write `spec/21-app/05-prompts/json/00-overview.md` — when to use each operation, file-naming conventions (`<slug>.prompt.json`, `<slug>.macro.json`, `prompts-export-<yyyymmdd>.json`).
25. [ ] Write `spec/21-app/05-prompts/json/01-save-single.md` — Save flow, target locations (download + clipboard), payload shape, validation.
26. [ ] Write `spec/21-app/05-prompts/json/02-export-all.md` — full-bundle export, ordering rules, secrets/PII redaction policy.
27. [ ] Write `spec/21-app/05-prompts/json/03-import-merge.md` — merge-by-Slug algorithm, conflict UI (Keep / Use theirs / Rename), dry-run preview.
28. [ ] Write `spec/21-app/05-prompts/json/04-replace-atomic.md` — confirm dialog, automatic backup key in chrome.storage.local, rollback path.
29. [ ] Write `spec/21-app/05-prompts/json/05-validation-and-errors.md` — Ajv usage, error-surface copy, failure-log shape per repo standard.
30. [ ] Write `spec/21-app/05-prompts/json/06-versioning-and-migration.md` — `Version` field semantics, forward/backward compat rules (mirror `mem://features/webhook-result-schema-version` pattern).

### Block 4 — Engine, Worked Examples & Test Plan (Tasks 31–40)
31. [ ] Write `spec/21-app/05-prompts/macros/engine/00-architecture.md` — modules, message flow (panel → background → injector), sequence diagram (Mermaid).
32. [ ] Write `spec/21-app/05-prompts/macros/engine/01-state-machine.md` — Idle → Running → Paused → Looping → Done / Failed with transitions table.
33. [ ] Write `spec/21-app/05-prompts/macros/engine/02-resume-after-sw-restart.md` — persisted-state keys, rehydration rules, max-stale window.
34. [ ] Write `spec/21-app/05-prompts/macros/engine/03-score-extraction.md` — regex(es) for parsing `score: NN/100` from audit output, fallback to "Unknown" + fail-fast.
35. [ ] Write `spec/21-app/05-prompts/macros/engine/04-audit-folder-writer.md` — exact write path, file naming, idempotency, name-collision handling.
36. [ ] Write `spec/21-app/05-prompts/macros/examples/00-spec-tighten-cycle.md` — full worked example matching the JSON shape in Part A, with expected artifacts list.
37. [ ] Write `spec/21-app/05-prompts/macros/examples/01-review-and-fix-loop.md` — second worked example: 3-loop cycle with `TargetScore=95`.
38. [ ] Write `spec/21-app/05-prompts/macros/examples/02-export-import-roundtrip.md` — export bundle → import on fresh profile → assertion checklist.
39. [ ] Write `spec/21-app/05-prompts/macros/testing/00-unit-tests.md` — engine state-machine, score parser, schema validators.
40. [ ] Write `spec/21-app/05-prompts/macros/testing/01-e2e-tests.md` — Playwright scenarios: run macro, pause/resume, SW-restart resume, loop-if branch, replace-via-JSON.

### Block 5 — Integration, Guards, Final Wiring (Tasks 41–50)
41. [ ] Update `spec/21-app/02-features/misc-features/advanced-automation.md` — cross-link to the new macros spec; mark Prompt-Macros as the prompt-layer counterpart to AutomationChain.
42. [ ] Update `spec/21-app/README.md` — add Macros bullet under "Prompts subsystem".
43. [ ] Update `.lovable/memory/index.md` — add Core line: "Prompt Macros write audits ONLY under `spec/audit/<runId>/`; never to `skipped/` or `.release/`." (preserve existing content — `code--write` replaces whole file).
44. [ ] Create `mem://features/prompt-macros` memory file documenting the macro engine contract.
45. [ ] Write `spec/21-app/05-prompts/macros/guards/00-forbidden-writes.md` — explicit list: never write to `skipped/`, `.release/`, `node_modules/`, `dist/`.
46. [ ] Write `spec/21-app/05-prompts/macros/guards/01-loop-safety.md` — `MaxLoops` enforcement, watchdog timer, sequential fail-fast (per `mem://constraints/no-retry-policy`).
47. [ ] Write `spec/21-app/05-prompts/macros/guards/02-no-supabase.md` — restate ban; all persistence via chrome.storage.local + SQLite per existing storage layers.
48. [ ] Write `spec/21-app/05-prompts/macros/observability/00-logging.md` — Logger.error namespace usage, run-scoped log file under `spec/audit/<runId>/_log.jsonl`.
49. [ ] Write `spec/21-app/05-prompts/macros/observability/01-metrics.md` — counters: macros_run_total, macro_loops_total, macro_failed_total, last_score histogram bins.
50. [ ] Write `spec/21-app/05-prompts/macros/CHANGELOG.md` and append "v1.0.0 — initial Prompt Macros spec" entry; close out plan with a 100-readiness re-score note.

---

## Execution rule

Say **`next 10`** and I execute the next un-checked block in one turn, then list remaining items.
