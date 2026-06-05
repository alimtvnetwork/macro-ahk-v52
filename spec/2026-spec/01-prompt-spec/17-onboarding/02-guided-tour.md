# 02 — Guided Tour Steps

**Date:** 2026-06-02
**Task:** T102

## Step sequence

| # | Anchor | Copy (sample) | Advance trigger |
|---|--------|---------------|-----------------|
| 1 | Dropdown trigger button | "Open the prompts menu to see what's available." | User clicks the trigger |
| 2 | Search input | "Type to filter — searches title, slug, and body." | User types ≥1 char OR clicks Next |
| 3 | First prompt row | "Pick any prompt; pressing Enter sends it to the chat." | User selects a prompt |
| 4 | Submit button (host) | "We just pasted it. Click submit when you're ready." | User clicks submit OR 5s elapse |
| 5 | Queue widget | "Re-runs and Plan mode show progress here." | User clicks "Got it" |

## Anchor resolution

Each step resolves its anchor via the same selector contract as the rest of the feature (`???` placeholders with `HOST:` hints). If an anchor cannot be resolved, the step is **skipped silently** — onboarding never blocks on a missing host element.

## Visual style

- Spotlight overlay (dimmed background, anchor cut-out).
- Tooltip with one-line copy + "Next" / "Skip tour" buttons.
- Dark theme only (per Core memory).

## Persistence per step

Each completed step writes `prompts.onboarding.step<N> = true`. On reload, the tour resumes from the lowest incomplete step. Completing step 5 sets `completedV1 = true`.

## Acceptance

- [ ] The implementation satisfies the `02 — Guided Tour Steps` contract in this file and the folder-level acceptance target: first-run, guided tour, empty states, help, and adoption telemetry remain discoverable.
- [ ] Verification passes when `E2E-onb-001..004` passes, and `node scripts/audit/check-acceptance.mjs --root=spec/2026-spec` reports this file has a machine-checkable acceptance contract.
