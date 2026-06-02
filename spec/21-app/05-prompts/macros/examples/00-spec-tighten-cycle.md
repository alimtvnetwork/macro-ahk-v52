# Worked Example — Spec Tighten Cycle

Reference macro: `standalone-scripts/macros/001-spec-tighten-cycle.macro.json`.

## Goal
Iteratively audit a spec folder, prompt for fixes, apply edits, and re-audit until `Score >= TargetScore` or `MaxLoops` hit.

## Variables (resolved at Start)
| Name | Type | Source | Example |
|------|------|--------|---------|
| `SpecRoot` | String | RunContext (user-supplied) | `spec/21-app` |
| `TargetScore` | Number | Macro.Default | `95` |
| `MaxLoops` | Number | Macro | `5` |
| `AuditPrompt` | String | Macro (refs `audit-spec` macro-prompt) | — |

## Step sequence

| # | Kind | Action | Expected Output |
|---|------|--------|-----------------|
| 0 | `JsInline` | Snapshot `SpecRoot` file list to `RunContext.FileList` | `{ files: string[] }` |
| 1 | `Prompt` | Send `AuditPrompt` with `{{ SpecRoot }}` interpolated; **LoopAnchor** | model output ending in `score: NN/100` |
| 2 | `JsInline` | `ScoreParsed` event consumed; if `Score >= TargetScore` → emit `Outputs.Done=true` | `{ Done: boolean }` |
| 3 | `Prompt` | Send `fix-spec` macro-prompt with audit findings | model output: edits to apply |
| 4 | `JsInline` | Apply edits via audit writer to `spec/audit/<RunId>/proposed-edits/` | `{ EditsApplied: number }` |
| 5 | `LoopIf` | `{{ Outputs.Done }} === false && LoopsRemaining > 0` → jump to step 1 | — |

## Expected artifacts under `spec/audit/<RunId>/`
```
_meta.json
_log.jsonl
variables-snapshot.json
step-00-js-inline-input.md
step-00-js-inline-output.md
step-01-prompt-input.md
step-01-prompt-output.md
step-02-js-inline-output.md
step-03-prompt-input.md
step-03-prompt-output.md
step-04-js-inline-output.md
proposed-edits/
  <relative-path-of-edited-file>.diff
  ...
```
After loop iterations, step files become `step-01-prompt-input.iter-2.md`, etc. (iteration suffix added when re-entering the loop).

## Expected event stream (happy path, 2 loops to reach score)
```
RunStarted
StepStarted(0) StepCompleted(0)
StepStarted(1) StepCompleted(1) ScoreParsed(score=82)
StepStarted(2) StepCompleted(2)
StepStarted(3) StepCompleted(3)
StepStarted(4) StepCompleted(4)
LoopEntered(iter=2, remaining=4)
StepStarted(1) StepCompleted(1) ScoreParsed(score=96)
StepStarted(2) StepCompleted(2)
RunFinished(FinalScore=96, LoopsConsumed=2)
```

## Failure paths exercised
- Score regex miss on step 1 → `Reason='ScoreNotFound'` → `RunFailed`.
- `MaxLoops` exhausted → `Reason='MaxLoopsReached'` → `RunFinished` (terminal, surfaces last score).
- Audit writer collision → `Reason='AuditCollision'` → `RunFailed`.

## Acceptance checklist
- [ ] Audit folder exists with all expected files.
- [ ] `_log.jsonl` is gap-free (EventSeq 0..N).
- [ ] `variables-snapshot.json` matches Variables table; Sensitive values masked.
- [ ] `RunFinished.FinalScore >= TargetScore` OR `Reason='MaxLoopsReached'`.
- [ ] No write outside `spec/audit/<RunId>/`.
