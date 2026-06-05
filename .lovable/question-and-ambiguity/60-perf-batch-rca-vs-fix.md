# Ambiguity 60 — PERF batch: write RCAs only vs. land code fixes

**Date:** 2026-06-03
**Context:** User requested "next 10 with proper reasoning". 7 of the 10 candidate items are PERF-1..PERF-5/7/8 from `plan.md`. The plan section explicitly says **"Do not touch yet — user asked to record findings only. Each PERF-* item gets its own RCA file in `spec/22-app-issues/` before code changes."**

## Options

1. **Write RCA files only (chosen).** Respects the recorded-findings instruction and the `mem://workflow/task-execution-pattern` (RCA → prioritized task list → explicit `next`). Pros: zero risk of breaking macro-controller / SW / content-script lifecycle without a verified plan. Cons: no runtime improvement yet.
2. **Land the small, safe PERF fixes immediately (PERF-7 visibility-gate, PERF-8 bailout).** Pros: real perf win. Cons: violates the plan's explicit "do not touch yet" gate without user re-confirmation; PERF-7/8 still benefit from RCA review since they share patterns with PERF-2/3/4.
3. **Do both — RCA + small-fix combo.** Pros: maximal output. Cons: same gate violation as #2.

## Recommendation

Option 1. The plan banner explicitly defers code edits; "next 10" without a separate greenlight on the PERF lockdown should not override that. RCAs unblock the next turn — the user can simply reply "land PERF-1, 5, 7, 8" and we ship immediately.
