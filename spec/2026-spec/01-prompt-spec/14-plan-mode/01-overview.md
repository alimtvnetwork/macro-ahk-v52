# 01 — Plan Mode Overview

**Date:** 2026-06-02
**Task:** T86

## Definition

**Plan mode** runs a single prompt — typically a "plan the next N steps" template — through the same queue engine as Next mode, but with different defaults tuned for longer, heavier responses.

It is **not** a new engine. It is a configuration profile + a designated default prompt slug.

## Differences from Next mode

| Aspect | Next | Plan |
|--------|------|------|
| Task `kind` | `"next"` | `"plan"` |
| Default count | user input, no cap suggestion | typically 1 |
| Default delay | 7000 ms | 12000 ms (longer streams) |
| `skipFirst` | true | false (small lead-in helps UI) |
| Default prompt | user-chosen | host-designated slug, overridable |
| Failure tone | per-task warning | per-task error (a failed plan derails the user) |

## Same as Next

- Queue store, task shape, statuses, ordering.
- Editor adapters, submit-button contract, interruption observer.
- Cancel / pause / resume semantics.
- Failure taxonomy and mandatory log shape.

## Why a separate mode at all

- Distinct entry point in the UI (dedicated button + shortcut).
- Distinct delay/observer defaults without polluting Next's settings.
- Distinct telemetry bucket so observability can show plan-vs-next health separately (see Step 16).

## Acceptance

- [ ] The implementation satisfies the `01 — Plan Mode Overview` contract in this file and the folder-level acceptance target: PlanLoop renders, queues, edits, and compares against NextLoop without autorun ambiguity.
- [ ] Verification passes when `E2E-plan-001..003` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

---

<!-- audit: numeric constants source-of-truth -->

Numeric defaults referenced in this file are canonical in [Runtime Defaults](../reference/05-runtime-defaults.md). If a value differs, the SOT wins.