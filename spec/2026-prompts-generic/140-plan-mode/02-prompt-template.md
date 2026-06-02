# 02 — Plan Prompt Template

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T87

## Default slug

`plan-default` lives in the host's shipped defaults bundle (see `30-prompt-source-format/04-default-vs-user-prompts.md`). Hosts may override the designated slug via settings.

## Template requirements

The plan prompt body MUST:
1. Instruct the model to produce a numbered list of next steps.
2. Reference the variable `{{count}}` for the desired step count (resolved from settings, default 10).
3. End with an explicit boundary marker so the idle observer can detect completion if the host streams chunked output.

## Reference body

```md
You are planning the next {{count}} concrete steps for the current task.

Rules:
- Each step is one sentence, actionable, no rationale.
- Number from 1 to {{count}}.
- After step {{count}}, output the line: `--- PLAN END ---`

{{selection}}
```

## Variables in scope

Plan mode resolves variables via the standard `PromptContext` plus:
- `count` — from `PlanSettings.stepCount`, default 10.
- `selection` — host-provided current selection text, may be empty.

Resolution order matches `40-loader-contract/03-variable-resolution.md`: Caller > Editor > Clock > Empty.
