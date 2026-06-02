---
name: prompt-macros
description: Prompt-Macros subsystem — ordered chains of typed steps (prompt, next-loop, audit, fix-from-audit, final-audit, loop-if, set-var, notify) driving repeatable AI workflows
type: feature
---

# Prompt Macros

A **Macro** is an ordered chain of typed steps that drives an AI workflow end-to-end (audit → fix → re-audit → loop until score met).

## Step kinds (8 total)

| StepKindId | Kind | Purpose |
|---:|---|---|
| 1 | `prompt` | Render template + inject into chatbox |
| 2 | `next-loop` | Emit `next N` until Count consumed or Condition hits |
| 3 | `audit` | Run audit prompt → writes `spec/audit/<RunId>/01-gap-analysis.md` + `02-findings.json` |
| 4 | `fix-from-audit` | Inject "fix based on `spec/audit/<RunId>/`" then `next-loop` |
| 5 | `final-audit` | Re-audit → writes `99-final-report.md` + numeric score |
| 6 | `loop-if` | If `score < TargetScore` jump to GotoStep (bounded by MaxLoops) |
| 7 | `set-var` | Mutate macro-scoped variable |
| 8 | `notify` | Toast or log milestone |

## Run model

- **Owner:** Background service worker
- **State:** `chrome.storage.local` under `Macro.RunState.<RunId>`
- **Resume:** SW restart re-hydrates from state-store; in-flight step resumes from `LastCompletedStepIndex + 1`
- **Watchdog:** per-step + total-run + loop-count timeouts
- **Event stream:** typed `MacroEvent` union → panel via message-bus

## Score extraction

Regex: `/^\s*Score:\s*(\d{1,3})\s*\/\s*100\s*$/m` — last match wins.

## Loop bounds

`MaxLoops` default **5**, hard cap **20**. No exponential backoff. Sequential fail-fast on watchdog timeout.

## Canonical references

- Spec: `spec/21-app/05-prompts/macros/00-concept.md` (normative)
- Engine: `spec/21-app/05-prompts/macros/engine/00-architecture.md` (10 files)
- Variables: see `mem://features/prompt-variables`
- Storage contract: `spec/21-app/05-prompts/macros/06-storage-contract.md`
- Guards: `spec/21-app/05-prompts/macros/guards/` (5 files)

## Constraints

- No Supabase. No localStorage for state. State lives in `chrome.storage.local`.
- No-retry policy applies — single-attempt for outbound webhook results.
- Failure-log schema (Reason + ReasonDetail + SelectorAttempts + VariableContext) is mandatory.
