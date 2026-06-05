# 01 — First-Run Experience

**Date:** 2026-06-02
**Task:** T101

## Trigger

A persistence flag `prompts.onboarding.completedV1` (boolean, default `false`). First time the host bootstraps the feature with this flag false, the onboarding surface activates on the next user-visible interaction (not on page load — avoids racing host bootstrap).

## Goal

In under 90 seconds, the user can:
1. Open the prompts dropdown.
2. Select a default prompt.
3. Run it once via Next.
4. See the result land in the ChatBox.

Nothing else is required for "onboarded".

## Out of scope for first-run

- Plan mode (introduced later via an in-app tip when the user opens Settings).
- Custom prompt authoring (introduced when the user clicks "+ New prompt").
- Import/export (Settings-only).

## Bypass

A "Skip tour" link is always visible. Skipping sets `completedV1 = true` without marking any individual step.

## Acceptance

- [ ] The implementation satisfies the `01 — First-Run Experience` contract in this file and the folder-level acceptance target: first-run, guided tour, empty states, help, and adoption telemetry remain discoverable.
- [ ] Verification passes when `E2E-onb-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.

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

---

> Owner: see [Documentation standards](mem://workflow/documentation-standards) for the authoritative rule backing the MUST/SHALL statements in this file.
