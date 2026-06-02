# Worked Example — Review-and-Fix Loop (3 iterations, TargetScore=95)

Macro slug: `review-and-fix-loop`.

## Scenario
Code-review prompt issues edits; loop until reviewer score ≥ 95 or 3 loops consumed.

## Variables
| Name | Type | Default |
|------|------|---------|
| `FilePath` | String | — (required, RunContext) |
| `TargetScore` | Number | `95` |
| `MaxLoops` | Number | `3` |

## Steps
| # | Kind | Body summary |
|---|------|--------------|
| 0 | `Prompt` | "Review `{{ FilePath }}` — output issues + `score: NN/100`". **LoopAnchor** |
| 1 | `JsInline` | Parse score; set `Outputs.Done = Score >= TargetScore`. |
| 2 | `Prompt` | "Apply fixes for the issues above to `{{ FilePath }}`." (skipped when `Done`) |
| 3 | `LoopIf` | `!Outputs.Done && LoopsRemaining > 0` → jump to 0 |

## Expected loop traces

**Case A — converges in 2 loops:**
```
iter 1: score=78 → fix
iter 2: score=96 → Done
RunFinished(FinalScore=96, LoopsConsumed=2)
```

**Case B — hits cap:**
```
iter 1: score=70
iter 2: score=83
iter 3: score=91
LoopsRemaining=0 → RunFinished(FinalScore=91, Reason='MaxLoopsReached')
```

**Case C — score missing:**
```
iter 1: model omits "score:" line
RunFailed(Reason='ScoreNotFound', ReasonDetail=<truncated tail>)
```

## Per-iteration audit files
```
step-00-prompt-input.iter-1.md
step-00-prompt-output.iter-1.md
step-02-prompt-input.iter-1.md
step-02-prompt-output.iter-1.md
step-00-prompt-input.iter-2.md
...
```

## Acceptance checklist
- [ ] `LoopEntered` event count = `LoopsConsumed - 1`.
- [ ] Final `ScoreParsed.Score` matches `RunFinished.FinalScore`.
- [ ] When `Done` is true on iter 1, step 2 input file is absent (skipped, not empty).
- [ ] Cap-hit case still emits `RunFinished` (not `RunFailed`) — hitting the cap is a defined terminal outcome.
