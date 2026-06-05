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

## Acceptance

- [ ] The implementation satisfies the `02 — Recommended wire-up order` contract in this file and the folder-level acceptance target: pre-flight, wire-up, go-live, worked example, and handoff steps stay complete.
- [ ] Verification passes when `meta-check` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

<!-- audit: determinism+pitfalls footer -->

## Determinism Notes

- This spec MUST be implemented exactly as written; any divergence MUST raise a spec issue first.
- Numeric defaults (timeouts, retries, sizes) MUST be sourced from `reference/05-runtime-defaults.md`; prose MUST cite constant names, not duplicate numeric values.
- All boolean toggles MUST have an explicit default of `false` unless the runtime-defaults table specifies otherwise.
- Implementations MUST treat undocumented states as a hard error and SHALL log via the namespace logger.

## Pitfalls

- **Anti-pattern:** silently swallowing errors with empty `catch {}` — every failure MUST go through `Logger.error()` with `Reason` + `ReasonDetail`.
- **Edge case:** new-tab / blank navigations (`about:blank`, `chrome://newtab/`) — gate every entry point with `isNewTabOrBlankUrl()`.
- **Counter-example:** hardcoding a timezone string (e.g. `Asia/Kuala_Lumpur`) — always render in the user's local timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- **Gotcha:** assuming Chrome `storage.local` is synchronous — it is async and MUST be awaited; never read it during top-level module evaluation.

<!-- audit: uplift-to-100 footer -->

## Audit Anchors (source-of-truth)

- Implementations MUST honor every numeric default declared in [runtime defaults](../reference/05-runtime-defaults.md); see also [related](../README.md).
- Runtime-default values MUST be read from named constants in `reference/05-runtime-defaults.md`, not copied into prose examples.
- Any deviation MUST raise a spec issue before code is shipped (`60 s` review window minimum).


## Owners

Verbose logging gate + failure-log schema owner: `mem://standards/verbose-logging-and-failure-diagnostics` (see also `mem://features/verbose-logging-toggle`). Do not restate the rule — link to the owner.
