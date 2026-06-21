---
title: Next 3 steps (Plan inventory sweep)
slug: next-task-28
---

# Next Task 28 — Plan inventory sweep

User invoked the v5 "Next ${N} Steps" prompt (N implied = 3). Implementation this turn:

1. **Audited** all 7 plan files in `.lovable/plans/`. Confirmed 4 are shipped: HTTP Fail-Fast (all 10 steps ✅, v3.5.2), Refill-Priority + GitHub-open (v3.10.0 per `mem://features/refill-priority-filter` + `mem://features/workspace-github-repo-open`), Credit-Totals + Macro UX 20-step (closed 2026-05-25 per memory), Prompt-Spec 2026 renumber (header marked EXECUTED 2026-06-03).
2. **Archived** the 4 with `mv` into `.lovable/plans/completed/` as `02-…` through `05-…` and prefixed each with `> **STATUS:** ✅ COMPLETED — archived 2026-06-21 (v3.91.0 plan-inventory sweep)`.
3. **Version bump + docs** — 3.90.0 → 3.91.0 across manifest, constants, 8 `instruction.ts` files, shared-state, payment-banner-hider index, readme pins; changelog + RELEASE_NOTES updated; plan log appended.

Verification: `ls .lovable/plans/` shows 3 pending + `completed/` + `subtasks/`; `ls .lovable/plans/completed/` shows 5 files (01-05); `✅ All versions in sync: 3.91.0`.
