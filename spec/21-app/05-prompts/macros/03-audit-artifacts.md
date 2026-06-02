# Audit Artifacts — Files Written per Run

**Created:** 2026-06-02 (Asia/Kuala_Lumpur)

Every macro run writes artifacts under a single, deterministic folder:

```
spec/audit/<RunId>/
  00-run-manifest.json        # written at RunStarted; updated at RunFinished
  01-gap-analysis.md          # written by first `audit` step
  02-findings.json            # structured findings, same step
  03-fix-plan.md              # written by `fix-from-audit` step (optional)
  10-loop-1-gap.md            # per-loop iteration outputs (loop-if branches)
  10-loop-1-findings.json
  11-loop-2-gap.md
  …
  99-final-report.md          # written by `final-audit` step
  99-final-report.json        # machine-readable: { Score, TargetScore, LoopCount, Status }
```

Numbering convention: `00` manifest, `01–09` first-pass audit, `10+` loop
iterations (per-loop prefix `10*N + …`), `99*` final.

## `00-run-manifest.json`

```json
{
  "RunId": "spec-tighten-cycle-20260602-094312",
  "MacroSlug": "spec-tighten-cycle",
  "MacroVersion": "1.0.0",
  "StartedAt": "2026-06-02T09:43:12+08:00",
  "FinishedAt": null,
  "Status": "Running",
  "TargetScore": 100,
  "MaxLoops": 3,
  "Variables": { "SpecRoot": "spec/" },
  "Steps": [ /* full Steps[] copy for reproducibility */ ]
}
```

Finalised at terminal state with `FinishedAt`, terminal `Status`,
`LoopCount`, `LastScore`.

## `01-gap-analysis.md`

Free-form markdown produced by the audit macro-prompt. **Must** include a
parseable score line:

```
Score: 87 / 100
```

Regex (single source of truth, lives in
`spec/21-app/05-prompts/macros/engine/03-score-extraction.md`):

```
/^\s*Score\s*:\s*(\d{1,3})\s*\/\s*100\s*$/im
```

## `02-findings.json`

```json
{
  "RunId": "spec-tighten-cycle-20260602-094312",
  "GeneratedAt": "2026-06-02T09:45:01+08:00",
  "Score": 87,
  "Findings": [
    {
      "Id": "F-001",
      "Severity": "P1",
      "Path": "spec/21-app/05-prompts/macros/01-step-kinds.md",
      "Title": "Missing watchdog timeout default",
      "Detail": "…",
      "Suggestion": "…"
    }
  ]
}
```

## `99-final-report.md` + `99-final-report.json`

Final-audit step writes both:

- `.md` — human-readable summary (executive summary + delta vs first pass).
- `.json` — machine-readable terminal state:

```json
{
  "RunId": "spec-tighten-cycle-20260602-094312",
  "Score": 100,
  "TargetScore": 100,
  "LoopCount": 2,
  "Status": "Done",
  "ArtifactPaths": [
    "spec/audit/spec-tighten-cycle-20260602-094312/01-gap-analysis.md",
    "spec/audit/spec-tighten-cycle-20260602-094312/02-findings.json",
    "spec/audit/spec-tighten-cycle-20260602-094312/99-final-report.md"
  ]
}
```

## Idempotency & collisions

- The audit-folder writer (see `engine/04-audit-folder-writer.md`, Task 65)
  **never overwrites** an existing file in the same run; collisions fail-fast
  with `Reason="AuditArtifactCollision"`.
- Re-runs use a **new `RunId`** (timestamp differs), so folder collisions
  across runs are impossible by construction.

## Forbidden write paths

The writer rejects any `WriteTo` that resolves outside `spec/audit/<RunId>/`
or that touches `skipped/`, `.release/`, `node_modules/`, `dist/`
(`mem://constraints/skipped-folders`). Violation →
`Reason="AuditWriteForbidden"` with the resolved absolute path in
`ReasonDetail`.
