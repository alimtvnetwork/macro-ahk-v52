# 04 — Component & E2E

**Date:** 2026-06-02
**Task:** T109

## Component (Testing Library)

| Component | Critical assertions |
|-----------|---------------------|
| Dropdown | Open via trigger, filter by search, Enter selects, Esc closes, focus returns to trigger |
| Prompt editor modal | Dirty tracking, Ctrl+S saves, Esc with dirty prompts confirm, slug immutable after create |
| Queue widget | Status pill renders for each `TaskStatus`, drag reorder updates `sortKey`, terminal tasks collapsible |
| Settings page | Per-section dirty + save, reset confirm, inline validation, autoclamps slider values |
| Plan panel | Steps clamp 1–50, missing slug disables Run, Enter on panel triggers Run |

## E2E happy paths (manual Chrome, per Core memory ban-lift)

1. **Open + run once** — open dropdown, pick default prompt, observe ChatBox receives text and submit clicks.
2. **Run × 5** — same, with count 5; queue widget shows 5 rows draining to `completed`.
3. **Pause + resume** — start a queue of 10, pause after task 2, resume, all 10 complete.
4. **Hold + recover** — trigger interruption banner mid-queue, queue holds, dismiss banner, click Resume, queue drains.
5. **Plan mode** — open plan panel, set steps=10, Run, observe plan prompt rendered with `{{count}}=10` and output stream completes.

## E2E acceptance criteria

- Each path completes in < 90s on a developer machine.
- No console errors at any point.
- Failure drawer shows zero entries after each successful run.
- Diagnostics export ZIP includes the expected events for the run.

## Acceptance

- [ ] The implementation satisfies the `04 — Component & E2E` contract in this file and the folder-level acceptance target: test inventories, target lists, fixtures, and mocks remain discoverable by automation.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
