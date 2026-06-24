# Marco Chrome Extension v4.1.0

## Changed

- **Inline `📋 Plan` strip (renamed from ✂ Split).** The amber strip below
  the Lovable chat box now appends the `Plan ${N}` library prompt onto
  whatever you've already typed — it no longer auto-submits. Review, tweak,
  then press Send yourself.
- **Expanded Plan presets.** Quick-pick buttons: 5, 10, 12, 15, 18, 20, 22,
  25, 28, 30, 32, 35, 38, 40, 42, 45, 48, 50, 52, 55, 58, 60, 70, 80, 100,
  125, 150, 200. Highlighted picks (stronger amber): **5, 10, 12, 15, 30**.
- **Trimmed Next presets.** `▶ Next` strip presets: 1, 2, 3, 5, 8, 10, 15.
  Highlighted: **5, 10**. Manual entry still accepts up to 200.

## Internal

- New export `triggerPlanPasteFromInline(n)` in `task-splitter-ui.ts`
  performs append-without-submit via `pasteIntoEditor` on the chat target.
- Legacy `triggerSplitFromInline` export kept for back-compat (unused by
  the inline strip).

## Verification

- `pnpm run lint` — clean (no new errors).
- Manual: open Lovable, type a sentence, click `📋 Plan` with `15`
  selected — chat box now contains your sentence followed by the
  `Plan 15` prompt body and is NOT submitted.
