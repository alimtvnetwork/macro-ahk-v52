# Component Test Inventory

React Testing Library + Vitest. Files under `src/**/__tests__/*.test.tsx`.

| ID | Component | Covers |
|---|---|---|
| CT-ui-001 | `<PromptDropdown>` | Opens on `/`, closes on `Esc` |
| CT-ui-002 | `<PromptDropdown>` | Arrow keys move selection, `Enter` inserts |
| CT-ui-003 | `<PromptDropdown>` | Search filter narrows list |
| CT-ui-004 | `<PromptItem>` | Renders title, category pill, keyboard hint |
| CT-ui-005 | `<QueuePanel>` | Shows pending/running/done counts |
| CT-ui-006 | `<QueuePanel>` | Pause/Resume button toggles state |
| CT-ui-007 | `<Toast>` | Auto-dismiss after 5 s; manual close |
| CT-ui-008 | `<ErrorBanner>` | Maps E-01..E-15 to copy |
| CT-ui-009 | `<EmptyState>` | All 6 empty-state variants render |

## Acceptance

- [ ] The implementation satisfies the `Component Test Inventory` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
