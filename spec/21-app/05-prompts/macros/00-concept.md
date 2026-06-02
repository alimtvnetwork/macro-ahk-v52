# Prompt Macros — Concept (Canonical)

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)
**Source:** Verbatim mirror of Part A of `.lovable/plans/prompt-macros-50-step.md`.
**Status:** Normative. Subsequent docs in `spec/21-app/05-prompts/macros/` refine
this concept; if they conflict, **this file wins** until a successor is marked
"supersedes 00-concept.md".

---

## A.1 Macro = ordered chain of typed steps

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

## A.2 Variables & Templating

Prompts are **templates**. Variables are declared inline with `{{ VarName }}`
(Mustache-lite, no logic). A prompt declares its variables in its `info.json`:

```json
{
  "Slug": "audit-spec",
  "Variables": [
    { "Name": "TargetFolder", "Type": "string", "Default": "spec/" },
    { "Name": "Depth",        "Type": "integer", "Default": 3 }
  ]
}
```

Prompt body:

```md
Audit folder {{ TargetFolder }} to depth {{ Depth }}. Score 0–100.
```

A macro step supplies values:

```json
{ "Kind": "prompt", "Slug": "audit-spec", "Variables": { "TargetFolder": "spec/21-app", "Depth": 4 } }
```

Resolution order (highest first):

1. Step-level `Variables`
2. Macro-level `Variables` (shared across all steps in the macro)
3. Run-level `Context` (`{{ RunId }}`, `{{ Now }}`, `{{ LoopCount }}`, `{{ LastScore }}`)
4. Prompt `Default`
5. → fail-fast with `Reason="MissingVariable"` + full `VariableContext[]` per repo standard

## A.3 Macro-Prompts in a separate folder

```
standalone-scripts/prompts/                # existing — human-invoked prompts
standalone-scripts/macro-prompts/          # macro-only template prompts
  001-audit-spec/
    info.json                              # PascalCase, lists Variables[]
    prompt.md                              # body with {{ Placeholders }}
  002-fix-from-audit/
  003-final-score/
standalone-scripts/macros/                 # macro definitions (.macro.json)
  001-spec-tighten-cycle.macro.json
```

Aggregate at build time (`scripts/aggregate-prompts.mjs` extended) into:

```
chrome-extension/prompts/macro-prompts.json     # union of human prompts
chrome-extension/macro-prompts/macro-prompts.json  # macro-only template prompts
chrome-extension/macros/macros.json             # macro definitions
```

The engine resolves a `Slug` by searching macro-prompts first, then regular
prompts — deterministic, fail-fast on duplicate.

## A.4 Run model

- `runId = <macroSlug>-<yyyymmdd-HHmmss>` (Asia/Kuala_Lumpur).
- All artifacts under `spec/audit/<runId>/` (created on first write).
- State `{ currentStep, loopCount, lastScore, runId, variables }` persisted in
  `chrome.storage.local` → survives SW restarts.
- Pause / Resume / Stop in the Prompts panel.
- Each `prompt` step uses existing injector; each `next-loop` reuses the
  Task Next sequential loop. **Sequential fail-fast** (`mem://constraints/no-retry-policy`).

## A.5 Canonical macro JSON

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

## A.6 JSON Save / Export / Import / Replace

- **Save** → `<slug>.prompt.json`, `<slug>.macro.json`.
- **Export All** → `prompts-export-<yyyymmdd>.json` =
  `{ Version, Prompts, MacroPrompts, Macros, Categories }`.
- **Import** → merge by `Slug`; conflict picker (Keep / Use theirs / Rename).
- **Replace** → atomic wipe-and-load with auto-backup to `chrome.storage.local`
  under `PromptsBackup.<timestamp>`.
- All payloads validated via Ajv against
  `schemas/{prompt,macro,prompts-bundle}.schema.json`.

## A.7 Prompts Button UX

Trigger 💬 button in chatbox → panel:

- Search · category chips · favorites pinned · prompt list · footer
  (`+ New`, `Import`, `Export`, `Reseed Defaults`, `🧩 Macros`).
- **Macros tab** inside the same panel: list with
  ▶ Run / ⏸ Pause / ⏹ Stop / ✎ Edit / ⧉ Duplicate / ⬇ Export / 🗑 Delete.
- **Variable prompt dialog**: when a step needs values, show inline form
  (typed inputs) before injection.
- **Running banner**: sticky, shows `runId`, step X/N, loop M/MaxLoops,
  last score, ⏸/⏹.
