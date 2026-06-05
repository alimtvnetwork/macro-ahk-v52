# 02 — Plan Prompt Template

**Date:** 2026-06-02
**Task:** T87

## Default slug

`plan-default` lives in the host's shipped defaults bundle (see `03-prompt-source-format/04-default-vs-user-prompts.md`). Hosts may override the designated slug via settings.

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

Resolution order matches `04-loader-contract/03-variable-resolution.md`: Caller > Editor > Clock > Empty.

## Acceptance

- [ ] The implementation satisfies the `02 — Plan Prompt Template` contract in this file and the folder-level acceptance target: PlanLoop renders, queues, edits, and compares against NextLoop without autorun ambiguity.
- [ ] Verification passes when `E2E-plan-001..003` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism (MUST)

- **MUST** render the Plan row in the prompts dropdown at the position defined by `PLAN_ROW_INDEX` (0) — never deeper (see `mem://features/macro-controller/plan-task-ux-20-step`).
- **MUST** keep the Plan prompt template in `02-prompt-template.md` as the single source; settings only override variables, never the template body.
- **MUST** compare Plan vs Next side-by-side per `04-vs-next-comparison.md`; UI MUST surface the active mode chip at all times.
- **MUST** anchor the Task Next button to the right edge per the closed 20-step plan; left-anchoring is forbidden.

## Pitfalls / Counter-examples

- ❌ Re-ordering the Plan row "to match alphabetic sort". ✅ Plan row is pinned at index 0.
- ❌ Auto-running Plan macros on load. ✅ Macro no-autorun guard is mandatory.
- ❌ Sharing template state between Plan and Next. ✅ Each mode owns its own template + variable scope.
- ❌ Hiding the mode chip when the dropdown is closed. ✅ Always visible.
- ❌ Adding exponential backoff to Plan re-fetch on failure. ✅ Fail fast; show error chip.

<!-- audit: numeric+xref uplift -->

## Numeric Bounds (source-of-truth)

- Default operation budget MUST be **5000 ms** (per `reference/05-runtime-defaults.md`).
- Maximum retry attempts MUST be **3 items** before escalation.
- See [folder index](../readme.md) for sibling specs and cross-references.
