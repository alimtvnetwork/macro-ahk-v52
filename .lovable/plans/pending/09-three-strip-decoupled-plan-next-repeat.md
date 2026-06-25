# Three-Strip Decoupled Flow — Plan / Next / Repeat

**Slug:** three-strip-decoupled-plan-next-repeat
**Steps:** 10
**Status:** pending
**Created:** 2026-06-25

## Context

Reorder and decouple the inline strip UI above the Lovable chat composer into three independent controls: **Plan** (paste-only), **Next** (paste-only), **Repeat** (the only submitter/looper, renamed from "Start"). No strip chains into another. Rename every "Start" surface to "Repeat".

Files involved:
- `standalone-scripts/macro-controller/src/ui/next-inline-ui.ts` — current inline strip host (Plan + Next + Repeat live here as of v4.4.0).
- `standalone-scripts/macro-controller/src/ui/task-splitter-ui.ts` — `resolvePlanPrompt`, `triggerPlanPasteFromInline` (paste-append behavior already exists for Plan; verify no submit path).
- `standalone-scripts/macro-controller/src/ui/task-next-ui.ts` — `runTaskNextLoop`, `runTaskNextQueue` (Next currently auto-submits and can loop; must be stripped to paste-only for the inline Next button).
- `standalone-scripts/macro-controller/src/ui/repeat-loop-ui.ts` — Repeat/Start loop runner; the executor.
- `standalone-scripts/macro-controller/src/ui/panel-builder.ts` — strip mount order.
- `standalone-scripts/macro-controller/src/ui/settings-ui.ts`, `settings-store.ts` — any "Start"-labeled settings copy.

Captured inputs:
- Command: `.lovable/spec/commands/01-three-strip-decoupled-flow.md`
- Prior related plan (closed): `.lovable/plans/completed/08-task-splitter-and-next-queue.md`
- Prior issue (closed): `.lovable/issues/01-task-next-queue-sequential.md`

## Steps

1. **RCA + surface inventory.** Grep the macro-controller bundle for every "Start" string (button label, aria-label, tooltip, toast, console log, settings copy) and every Next auto-submit/loop call site. Write findings to `./subtasks/09-three-strip-decoupled-plan-next-repeat/SS-01-rca.md` with file:line for each hit. No code edits.
2. **Strip order — Plan → Next → Repeat.** In `next-inline-ui.ts` (and `panel-builder.ts` if it controls mount sequence), reorder the three rows so Plan renders first, Next second, Repeat third. Persisted collapse state keys stay unchanged.
3. **Rename Start → Repeat everywhere.** Replace every label/aria/tooltip/toast/console/settings string `Start` → `Repeat` (and `▶ Start` → `🔁 Repeat`). Keep internal function names (`runRepeatLoop` etc.) as-is unless trivially renamable in one pass; UI-visible strings are the gate.
4. **Plan strip — confirm paste-append only.** Verify `triggerPlanPasteFromInline` calls `appendToChat` (or equivalent paste-without-submit) and never dispatches Enter/submit. Add a regression test asserting no submit-button click and no Enter keydown during a Plan number click. See `./subtasks/09-three-strip-decoupled-plan-next-repeat/SS-04-plan-paste-only.md`.
5. **Next strip — strip submit + loop from the inline button.** The inline Next count buttons must call a new `stageNextPrompt(n)` that ONLY pastes the Next-${N} prompt text into the composer (append, not replace) and toasts `📝 Next ${N} staged — press Enter to send`. They must NOT call `runTaskNextLoop`, `runTaskNextQueue`, `dispatchSubmit`, or the task-queue drain. The persistent task-queue dequeue stays available for Repeat only.
6. **Repeat strip — sole executor.** `runRepeatLoop(n)` remains the only path that calls paste→submit→waitForLovableIdle in a loop. Confirm no other surface (Plan, Next, splitter, prompt dropdown) calls `dispatchSubmit` or the idle-gated cycle runner. Add a guard log `Logger.info('RepeatLoop.start', { N, Source })` and assert `Source==='repeat-strip'`.
7. **Decoupling guard.** Add a module-level boolean `INLINE_AUTOCHAIN_DISABLED = true` in `next-inline-ui.ts` and short-circuit any residual "after Plan, arm Next" / "after Next, start Repeat" callbacks. Document the guard in the file header.
8. **Tests.** Add `src/__tests__/inline-strip-decoupled.test.ts` covering: (a) Plan click appends text and does not submit; (b) Next click appends text and does not submit/loop; (c) Repeat click submits and loops N times with idle gate; (d) clicking Plan then Next then Repeat performs three independent actions with no implicit chaining. Extend `task-next-no-fallback.test.ts` if needed.
9. **Lint + targeted vitest.** `npx eslint standalone-scripts/macro-controller/src/ui/next-inline-ui.ts standalone-scripts/macro-controller/src/ui/task-next-ui.ts standalone-scripts/macro-controller/src/ui/repeat-loop-ui.ts --max-warnings=0` and `npx vitest run inline-strip-decoupled task-next-no-fallback task-splitter-prompt` — both must pass before release.
10. **Minor release + plan move.** Bump 4.5.0 → 4.6.0 across `manifest.json`, `version.json`, `src/shared/constants.ts`, `standalone-scripts/macro-controller/src/shared-state.ts`, `standalone-scripts/payment-banner-hider/src/index.ts`, every `standalone-scripts/*/src/instruction.ts`, and root `readme.md` pins. Add `changelog.md` entry for v4.6.0 (Changed: Plan/Next/Repeat decoupled + Start renamed). Run `node scripts/check-version-sync.mjs`. `mv` this file to `.lovable/plans/completed/09-three-strip-decoupled-plan-next-repeat.md` and flip `Status:` to `completed`.

## Verification

- Step 1: subtask RCA file lists every Start-label hit with file:line; no code changed.
- Step 2: visual confirmation in preview — strips render Plan, Next, Repeat top-to-bottom.
- Step 3: `rg -n '▶ Start|"Start"|>Start<' standalone-scripts/macro-controller/src` returns zero UI hits.
- Step 4–6: vitest assertions green; manual click-through confirms Plan/Next never submit, Repeat does.
- Step 7: guard constant present, header comment explains intent.
- Step 8–9: vitest + targeted ESLint both exit 0.
- Step 10: `node scripts/check-version-sync.mjs` exits 0; plan file lives only in `completed/` afterwards.

## Appended from prior pending tasks

None — `.lovable/plans/pending/` was empty at plan creation; `.lovable/issues/01-task-next-queue-sequential.md` is resolved (sequential drain shipped in plan 08).
