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
