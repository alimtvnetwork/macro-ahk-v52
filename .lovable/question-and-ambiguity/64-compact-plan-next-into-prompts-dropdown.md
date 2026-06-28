# 64 — Compact Plan + Next into prompts dropdown; exclude-from-export flag

Date: 2026-06-28
Status: Open (no-questions-mode active)

## Voice transcript (verbatim)
> In the prompt section, I don't want to have like next, next, next.
> Next and the Plan should be compact in the prompt section together with
> the dropdown. So you should not be writing it here. Replace it with the
> previous Plan and Next with these buttons. Also disable the cut prompts
> for now and add a flag in the prompts to disable prompts from exporting.

## Interpretation
1. The two inline strips above the Lovable chat box (📋 Plan and ▶ Next,
   mounted by `next-inline-ui.ts`) are visually noisy. User wants them
   collapsed into the existing **prompts dropdown** row (built by
   `prompt-dropdown.ts`) as two compact dropdown buttons — Plan ▾ / Next ▾
   — instead of always-visible preset chips.
2. "Disable the cut prompts" → assumed to mean: hide/disable the legacy
   "cut" prompt entries (any prompt whose slug contains `cut`) from the
   dropdown for now. Not deleting files — just filtering.
3. "Flag to disable prompts from exporting" → add an optional boolean
   `excludeFromExport` on each prompt entry (info.json + runtime type +
   PromptsConfig). When true, `prompt-io.ts` exporter skips that entry.
   Default false (backwards compatible).

## This-turn scope (minimal, immediate)
- Remove the standalone `📋 Plan` and `▶ Next` inline strips from the
  area above the chat textarea (stop mounting `marco-split-inline` and
  `marco-next-inline`).
- Surface Plan + Next as two compact popover buttons inside the existing
  prompts dropdown header (alongside the search/filter chips).
- Add `excludeFromExport?: boolean` on the prompt entry type, honour it
  in the exporter, and round-trip it in info.json.
- Filter prompts whose slug matches `/cut/i` out of the dropdown list
  (search + dropdown), gated behind a single constant so it is easy to
  re-enable later.

## Deferred / needs confirmation later
- Whether "cut prompts" means slug-`cut` or a different category.
- Whether the inline strips should be fully removed or only hidden by
  default with a settings toggle.
- Whether `excludeFromExport` should also hide from import-merge.
