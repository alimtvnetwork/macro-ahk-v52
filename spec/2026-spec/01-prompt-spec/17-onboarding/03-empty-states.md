# 03 — Empty States

**Date:** 2026-06-02
**Task:** T103

## Surfaces

| State | Trigger | UI |
|-------|---------|----|
| No prompts at all | First boot before defaults register OR user deleted everything | Dropdown shows: *"No prompts yet — [Import bundle] or [Create one]."* |
| No search matches | User typed a query with zero hits | List area shows: *"No matches for '<query>'. Clear search."* |
| No categories defined | User filtered by a category that was just deleted | Filter chip collapses, dropdown reverts to all prompts. No modal. |
| Queue empty | After drain | Queue widget shows: *"Queue is clear. Run a prompt to start."* |
| Plan: missing default slug | Configured `promptSlug` not resolvable | Plan panel shows: *"Default plan prompt not found. [Choose another]."* |

## Rules

- Every empty state offers exactly **one** primary action; secondary actions go in an overflow menu.
- Empty-state copy is plain language, no jargon — matches the project's question-asking-style rule.
- Empty states are **announced** to assistive tech via the same live-region used for queue events.

## Forbidden

- Spinner-as-empty-state. If data is loading, render a skeleton, not the empty message.
- Toast-only empty states. Empty UI must be inline so the user understands where they are.

## Acceptance

- [ ] The implementation satisfies the `03 — Empty States` contract in this file and the folder-level acceptance target: first-run, guided tour, empty states, help, and adoption telemetry remain discoverable.
- [ ] Verification passes when `E2E-onb-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
