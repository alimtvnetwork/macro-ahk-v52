# Empty States

| Surface | Trigger | Copy | Primary action |
|---|---|---|---|
| Dropdown | No prompts loaded | "No prompts yet. Add one to get started." | "Create prompt" → opens editor |
| Dropdown | Filter matches none | "No prompts match \"{query}\"" | "Clear filter" |
| Queue panel | No tasks | "Queue is empty. Pick a prompt to enqueue." | "Open picker" |
| Plan-mode | No plan generated | "Plan will appear here after you run a prompt." | "Run prompt" |
| Settings → Host overrides | None configured | "No host overrides. Defaults apply everywhere." | "Add override" |
| Onboarding step 1 | First run | "Welcome — type `/` in any input to begin." | "Show tour" |

All empty states use the same `<EmptyState illustration label cta>` component to guarantee visual + a11y consistency.

## Acceptance

- [ ] The implementation satisfies the `Empty States` contract in this file and the folder-level acceptance target: the prompt feature spec remains internally linked and blind-AI implementable.
- [ ] Verification passes when `node scripts/audit/check-dangling-links.mjs` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
