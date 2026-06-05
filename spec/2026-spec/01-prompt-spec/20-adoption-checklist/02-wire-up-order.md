# 02 — Recommended wire-up order

**Date:** 2026-06-02
**Task:** T117

1. **Data model** (`02-data-model/`) — define `Prompt`, `PromptCategory` types in host code.
2. **PromptStore** (`70-save-create-edit/`) — start with the in-memory reference (T111); swap later.
3. **Loader** (`04-loader-contract/`) — wire host fetch + cache; verify variable resolution.
4. **UI surface** (`05-ui-contract/`) — render dropdown; smoke-test keyboard + a11y.
5. **Injection** (`06-injection-contract/` + adapters) — implement Q4 adapter only; verify paste read-back.
6. **Queue engine** (`10-queue-model/` + `11-queue-lifecycle/`) — drop in reference engine (T112).
7. **Next loop** (`09-next-overview/`) — wire Q1/Q2/Q3 hooks via reference orchestrator (T115).
8. **Plan mode** (`14-plan-mode/`) — re-use the same engine with the plan profile.
9. **Settings** (`15-settings/`) — surface delay, jitter, max-retry, editor-kind controls.
10. **Observability** (`16-observability/`) — enable verbose toggle only after the loop is stable.

Skipping a step is allowed only when its acceptance bullets in the matching folder are already covered by the host.
