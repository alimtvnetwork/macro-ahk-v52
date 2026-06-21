---
Slug: rca-and-idle-signal
Status: pending
Created: 2026-06-21
Parent: 01-task-next-queue-sequential
---

# SS-01 — RCA + Lovable idle-signal selection

Goal: pick the most reliable "Lovable has finished generating" signal so cycle k+1 starts at the right moment. Three candidates — evaluate, pick one, record the choice.

## Candidates

1. **Submit/Stop button state swap** — while generating, the chat-input action button is "Stop"; when idle, it flips back to "Submit". XPath/role-based detection already exists in `standalone-scripts/macro-controller/src/ui/repeat-loop-ui.ts` for the Repeat Loop. Pros: stable across Lovable UI rewrites because the role/aria-label is semantic; same predicate the user already trusts. Cons: brief flicker window between cycles — needs a small debounce (~250 ms confirmed-idle).
2. **Streaming-token DOM mutation quiet period** — observe the assistant message container; consider "idle" after N ms with no childList/characterData mutations. Pros: no button dependency. Cons: false-positive on long pauses inside a single generation; brittle to virtualised lists.
3. **Network-level fetch/SSE end** — hook `window.fetch` or `EventSource` and watch for the chat-completion stream to close. Pros: most accurate. Cons: Lovable rotates endpoints; MAIN-world fetch monkey-patch risks colliding with page code; over-engineering for a UI gate.

## Recommendation

Use **#1 (Stop→Submit swap)** with a 250 ms confirmed-idle debounce. Reuse the existing predicate from `repeat-loop-ui.ts` rather than duplicating selectors — extract it into a shared helper `await waitForLovableIdle(deps, { debounceMs: 250, timeoutMs: 180_000 })` in a new file `standalone-scripts/macro-controller/src/ui/lovable-idle.ts`. Repeat Loop migrates to the helper in the same step (no behaviour change, just deduplication).

## Root cause (one sentence — to be confirmed in step 1 of the parent plan)

`runTaskNextLoop` was hard-capped to a single paste in v3.74.0 PASTE-ONLY mode and never received the sequential-queue runner that the submenu's "Next N" picker implies, so the submenu count is silently ignored.

## Done when

- Helper file path decided and recorded above.
- The 250 ms debounce + 180 s timeout numbers either confirmed or revised with a one-line justification.
- One-sentence root cause copied to the top of `.lovable/plans/pending/01-task-next-queue-sequential.md`.
