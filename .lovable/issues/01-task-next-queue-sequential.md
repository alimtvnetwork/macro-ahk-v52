---
Slug: task-next-queue-sequential
Status: resolved
Created: 2026-06-21
Reporter: user
Related-Files:
  - standalone-scripts/macro-controller/src/ui/task-next-ui.ts (runTaskNextLoop, lines 185-219)
  - standalone-scripts/macro-controller/src/ui/prompt-dropdown.ts (Task Next split-button label/arrow handlers)
---

# Issue: Task Next "next N tasks" pastes all prompts at once instead of queueing

## Symptom
When the user picks a count > 1 from the Task Next submenu (e.g. "Next 3 tasks"), the macro should paste prompt #1, wait for Lovable to finish generating, then paste #2, then #3. Instead, only one paste happens (current PASTE-ONLY guard at `task-next-ui.ts:204-206` blocks multi-run), OR — depending on which path the user actually invoked from the prompt dropdown — multiple prompts are stuffed into the editor back-to-back without waiting.

## Expected
- Count = N → exactly N sequential paste+submit cycles.
- Cycle k starts ONLY after Lovable has finished generating for cycle k-1 (idle detection on the Submit/Stop button or response stream).
- Remaining cycles sit in a visible queue (badge or toast: "2 of 3 queued").
- Escape cancels the queue (already wired for `taskNextState.cancelled`).

## Actual
- `runTaskNextLoop()` short-circuits when `requested > 1` and pastes once with a warning log (v3.74.0 PASTE-ONLY guard).
- No queue object, no idle gate, no per-cycle bookkeeping.

## Repro
1. Open Lovable project page with the macro injected.
2. Open the Task Next split-button → submenu → pick "Next 3".
3. Observe: single paste (or batched paste depending on entry point) — never a sequential 1→2→3 with waits.

## Acceptance
- Sequential queue with idle-gate; cancel-on-Escape; visible queue indicator; failure of cycle k aborts the rest with a clear toast and `Logger.error('TaskNextQueue.cycle', …)` entry.
