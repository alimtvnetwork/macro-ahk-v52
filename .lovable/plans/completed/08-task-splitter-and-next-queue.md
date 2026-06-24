# Task Splitter + Next-button queue (10 steps)

**Slug:** task-splitter-and-next-queue
**Steps:** 10
**Status:** pending
**Created:** 2026-06-24

## Context

User flow: paste a long instruction containing many tasks, then pick a number **N** from the Task Splitter button (e.g. `10`). The macro must (a) ask the LLM to split the pasted instruction into exactly N ordered subtasks, persist them as a project-scoped queue, then (b) on each click of the **Next** button, dequeue the next subtask, paste it into the Lovable composer, submit, wait for Lovable to finish generating, and stop — one cycle per Next press. The Next-N submenu (Next 2 / Next 3 / Next 10) drains N items sequentially, gated by the existing idle predicate from `repeat-loop-ui.ts`.

Files involved:
- `standalone-scripts/macro-controller/src/ui/task-splitter-ui.ts` — splitter entry, count picker, dispatchSubmit
- `standalone-scripts/macro-controller/src/ui/task-next-ui.ts` — `runTaskNextLoop`, `taskNextState`, queue runner (partial work from issue 01)
- `standalone-scripts/macro-controller/src/ui/prompt-dropdown.ts` — split-button + submenu wiring
- `standalone-scripts/macro-controller/src/queue-control/` — new home for the persistent queue
- `standalone-scripts/macro-controller/src/paste-into-editor.ts` — paste outcome union
- `standalone-scripts/macro-controller/spec/issue-131-task-queue.md` — existing queue design doc to reconcile against
- Related capture: `.lovable/issues/01-task-next-queue-sequential.md` (already resolved for sequential drain; this plan extends to splitter-produced queues)

## Steps

1. **RCA + storage choice.** Read `task-splitter-ui.ts`, `task-next-ui.ts:32-219`, and `spec/issue-131-task-queue.md`. Decide IndexedDB-only (per-project `task_queue` section) vs dual IndexedDB+SQLite. Write the decision + signals reused (Lovable-idle predicate from `repeat-loop-ui.ts`) into `./subtasks/08-task-splitter-and-next-queue/SS-01-rca.md`.
2. **Splitter prompt template.** Add `getSplitterPrompt(rawInstruction, n)` in `task-splitter-ui.ts` that wraps the user's long instruction with a fixed system preamble: "Split the following into exactly N self-contained subtasks numbered 1..N. Output strict JSON `{ "subtasks": string[] }`. No prose." Unit-test the wrapper with N=1, N=10, N=50.
3. **Persistent queue module.** Create `standalone-scripts/macro-controller/src/queue-control/task-queue.ts` exporting `enqueueMany(projectId, items)`, `peek(projectId)`, `dequeue(projectId)`, `clear(projectId)`, `count(projectId)`. Storage: `ProjectKvStore` section `task_queue`, shape `{ items: { id, text, status, createdAt }[] }`. Sequential fail-fast — no retry/backoff per `mem://constraints/no-retry-policy`.
4. **Splitter → queue wiring.** When the user picks a number from the Task Splitter button, build the splitter prompt, paste-and-submit ONCE, then on Lovable-idle parse the assistant JSON reply via a DOM reader, validate exactly N items, and `enqueueMany(projectId, items)`. Failure path logs `Logger.error('TaskSplitter.parse', { Reason, ReasonDetail, ExpectedN, ReceivedN, RawSample })` and shows toast `❌ Splitter parse failed (got K of N)`.
5. **Next button: single-press dequeue.** Modify `runTaskNextLoop(deps, 1)` so that when the persistent queue is non-empty it dequeues the head item and uses THAT text instead of the static "Next" prompt. When the queue is empty fall through to the legacy static-prompt behaviour. Badge near the Next label shows remaining count `(k left)`.
6. **Next-N submenu: queue drain.** Extend `runTaskNextQueue(deps, n)` (already added per issue 01) to prefer queue-backed items when available — drain min(n, queue.length) entries with the existing idle gate between cycles. Escape cancels mid-drain and surfaces `🛑 Drain cancelled at k/N (M left)`.
7. **Reinjection toast on startup.** On macro mount, if `count(projectId) > 0`, show a toast "You have K queued tasks. [Continue] [Clear]". Continue is a no-op (queue already persists); Clear calls `clear(projectId)` and hides the badge.
8. **Settings: splitter + queue toggles.** Add to Options → Timing: `splitterAutoEnqueue` (bool, default true), `nextSubmissionDelaySeconds` (slider 0–120, default 30), `maxQueueSize` (number, default 50). Persist via existing settings store; hydrate on GET/SAVE_SETTINGS like the verbose-logging toggle.
9. **Tests.** Add `src/__tests__/task-queue.test.ts` (enqueue/peek/dequeue/clear round-trip, max-size enforcement) and `src/__tests__/task-splitter-parse.test.ts` (N=1, N=10, malformed JSON, wrong-length array → throws with the mandatory `TaskSplitter.parse` schema). Extend `task-next-no-fallback.test.ts` to cover queue-backed dequeue.
10. **Version bump + plan move.** Bump 3.104.x → next patch across `manifest.json`, `version.json`, `src/shared/constants.ts`, every `standalone-scripts/*/src/instruction.ts`, `standalone-scripts/macro-controller/src/shared-state.ts`, `standalone-scripts/payment-banner-hider/src/index.ts`, root `readme.md` pin. Add changelog entry. `mv` this file to `.lovable/plans/completed/08-task-splitter-and-next-queue.md` and flip `Status:` to `completed`.

## Verification

- Step 1: RCA file exists with chosen storage + idle-signal lines.
- Step 2–4: vitest green; manual run pastes splitter prompt and after Lovable idle the IndexedDB `task_queue` section contains exactly N items.
- Step 5: clicking Next with a populated queue pastes item 1's text (not the static "Next" prompt); badge decrements.
- Step 6: Next 10 with 7 queued drains 7 then stops with a "queue empty" toast; Escape mid-drain cancels.
- Step 7: reload page with queued items → toast appears; Clear empties the queue.
- Step 8: settings persist across reload; slider value gates the inter-cycle wait.
- Step 9: `pnpm vitest run task-queue task-splitter-parse task-next-no-fallback` green.
- Step 10: `node scripts/check-manifest-version.mjs` green; plan file lives only in `completed/`.

## Appended from prior pending tasks

None — `.lovable/plans/pending/` was empty; existing `.lovable/issues/01-task-next-queue-sequential.md` is already resolved (sequential drain shipped) and only the splitter-produced queue work remains, which is this plan.
