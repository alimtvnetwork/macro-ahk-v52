# 62 — Repeat box collapse + prompts UI compaction + plan-section prompts

**Date:** 2026-06-19  •  **Status:** logged (deferred from v3.59.0)

## Context

User asked in one rambling message for several things alongside the v3.59.0 fixes:

1. Add a **collapse-to-arrow** button on the floating "Repeat" box so it can shrink to a small chevron and re-expand.
2. Make the **prompts dropdown UI more compact** (rows are too tall).
3. Refresh the **plan-section prompts** — they reference older "next steps" behaviour that was superseded by `12-next-steps-v7.md`.

The v3.59.0 release shipped the two concrete code asks (payment-banner pattern matching + repeat-loop form-submit) and version bump. The three items above are pure UI / content work and were deferred to keep the release scoped.

## Options

### A — Collapse button on repeat box (recommended, do next)
- Add a 16×16 chevron at the top-right of `repeat-loop-ui.ts`'s mount-point container.
- Persist `collapsed:boolean` in `marco-repeat-loop-prefs` (same localStorage key, schema v2).
- Collapsed = render only the chevron + a tiny "🔁 N/M" counter when running; expanded = current full controls.
- **Pros:** small surface, reuses persistence pattern; **Cons:** must keep two synchronized mount points (panel section + inline strip) in sync — one shared render fn.

### B — Compact prompts dropdown
- Reduce row height in `standalone-scripts/macro-controller/src/ui/prompt-dropdown.ts` (line-height + padding).
- Hide the long tag list behind a `…` overflow with hover tooltip.
- **Pros:** purely CSS; **Cons:** need to also tighten the prompt-filter-menu so it visually matches.

### C — Plan-section prompts refresh
- Audit `.lovable/prompts/13-plan-steps-v7.md` against `plan-task-ui.ts` rendering.
- Likely just needs the "next" command convention reference and the latest `next ${N}` aliases.

## Recommendation

Tackle in next batch as a single "Repeat-box + Prompts UI polish" patch, version 3.60.0. None of the three need backend changes; all are presentation-layer.
