---
Slug: task-next-queue-sequential
Steps: 5
Status: pending
Created: 2026-06-21
---

# Task Next — sequential queue for "Next N tasks"

**Slug:** task-next-queue-sequential
**Steps:** 5
**Status:** pending
**Created:** 2026-06-21

## Context

User reports that selecting "Next 3 tasks" from the Task Next submenu does NOT queue: it either pastes once (current `runTaskNextLoop` PASTE-ONLY guard at `standalone-scripts/macro-controller/src/ui/task-next-ui.ts:199-206`) or stuffs multiple prompts back-to-back depending on entry point. Expected behaviour: paste #1 → submit → wait until Lovable finishes generating → paste #2 → submit → wait → paste #3. Remaining cycles visible in a queue indicator; Escape cancels.

Captured issue: `.lovable/issues/01-task-next-queue-sequential.md`

Files most likely involved:
- `standalone-scripts/macro-controller/src/ui/task-next-ui.ts` (`runTaskNextLoop`, `taskNextState`, `setupTaskNextCancelHandler`)
- `standalone-scripts/macro-controller/src/ui/prompt-dropdown.ts` (split-button label / arrow handlers from v3.79.x)
- `standalone-scripts/macro-controller/src/paste-into-editor.ts` (`pasteIntoEditor` — outcome union)
- Submit/Stop button detection — already used by Repeat Loop (`repeat-loop-ui.ts`) → reuse the same idle predicate

## Steps

1. **RCA + idle-signal selection** — read `runTaskNextLoop` (185-219), `taskNextState` shape (32-49), and the Repeat Loop's idle/Stop-button detection in `repeat-loop-ui.ts`. Decide whether "Lovable is done generating" is signalled by Stop→Submit button swap, by response-stream-end DOM event, or by an XPath-watched element. Write the chosen signal + 1-sentence root cause into a new RCA block at the top of this plan before any code change. See `./subtasks/02-task-next-queue-sequential/SS-01-rca-and-idle-signal.md`.
2. **Introduce queue state + cycle runner** — extend `taskNextState` with `{ queue: number[], currentIndex: number, total: number }`; add `runTaskNextQueue(deps, count)` that drives cycle k via `pasteIntoEditor` → click Submit → `await waitForLovableIdle()` → increment → recurse until `count` reached or `cancelled` flips true. Sequential fail-fast per `mem://constraints/no-retry-policy` — no exponential backoff. Failure of any cycle calls `Logger.error('TaskNextQueue.cycle', { Reason, ReasonDetail, CycleIndex, Total, ElapsedMs })` and aborts the rest. See `./subtasks/02-task-next-queue-sequential/SS-02-queue-runner.md`.
3. **Wire submenu + split-button to the queue** — in `prompt-dropdown.ts`, the submenu count picker (Next 2 / Next 3 / Next N) must call `runTaskNextQueue(deps, n)` instead of `runTaskNextLoop(deps, n)`. The split-button label (single click) keeps calling `runTaskNextLoop(deps, 1)` (paste-once, no submit) — that path is unchanged. Update the tooltip on submenu rows to "Pastes + submits N prompts sequentially, waiting for each generation to finish."
4. **Queue indicator + Escape cancel** — add a small badge near the Task Next label that shows `k / N` while a queue is active (hidden when idle). Extend `setupTaskNextCancelHandler` so Escape during a queue sets `cancelled=true` AND surfaces a toast `🛑 Task Next queue cancelled at k/N`. On natural completion show `✅ Task Next queue finished N/N`.
5. **Tests + version bump** — add `src/__tests__/task-next-queue.test.ts` covering: (a) N=1 still calls the legacy paste-once path; (b) N=3 invokes `pasteIntoEditor` exactly 3× with the idle gate awaited between each; (c) `cancelled=true` after cycle 1 stops further pastes; (d) a failing cycle aborts the rest and emits the `TaskNextQueue.cycle` error with the mandatory schema. Then bump 3.80.0 → 3.81.0 across `manifest.json`, `version.json`, `src/shared/constants.ts`, all `standalone-scripts/*/src/instruction.ts`, `standalone-scripts/macro-controller/src/shared-state.ts`, `standalone-scripts/payment-banner-hider/src/index.ts`, and readme pins; add a `v3.81.0` changelog entry; move this plan from `pending/` to `completed/` via `mv`.

## Verification

- Step 1: RCA paragraph + chosen idle signal committed at top of this file before any code edit; reference the exact line numbers of `runTaskNextLoop` and the reused idle predicate.
- Step 2: `pnpm vitest run task-next-queue` passes; manual run on a Lovable project shows 3 paste+submit cycles separated by real generation waits.
- Step 3: clicking the split-button LABEL still does a single paste (no submit); picking "Next 3" from the submenu triggers the queue.
- Step 4: badge visible during the queue, hidden otherwise; Escape cancels mid-queue with the expected toast; completion toast fires.
- Step 5: vitest green; `node scripts/check-manifest-version.mjs` green; service-worker console shows `[TaskNextQueue] cycle 1/3 idle=…ms` lines, and no swallowed catches anywhere in the new path. Plan file lives only in `completed/` afterwards.

## Appended from prior pending tasks

None — `.lovable/plans/pending/` and `.lovable/plans/completed/` are both empty as of 2026-06-21. The 10-step credit-bar work in `.lovable/plan.md` is tracked separately by `prompts/12-next-steps-v7.md` cycles and is not duplicated here.
