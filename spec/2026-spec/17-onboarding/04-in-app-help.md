# 04 — In-App Help

**Date:** 2026-06-02 (Asia/Kuala_Lumpur)
**Task:** T104

## Surfaces

1. **`?` button** in the dropdown footer → opens a slide-over with:
   - Keyboard shortcut reference.
   - Variable cheat sheet (`{{date}}`, `{{selection}}`, `{{cursor}}`, host-registered vars).
   - Link to "Replay tour".
2. **Tooltip-on-hover** for every queue-row failure badge — shows the `FailureReason` + one-sentence "what to do".
3. **Inline hint chips** under fields where validation has nuance (e.g. the delay slider's "below 5s risks throttling").

## Replay tour

`prompts.onboarding.completedV1 = false` + reload. The "Replay tour" link sets the flag and reloads only the feature surface (not the host page).

## Content authoring

Help strings live in a single `help.json` file colocated with the feature, keyed by stable ids. The host MAY override by registering a `HelpStringsProvider` at bootstrap (mirrors the host-overrides pattern in `15-settings/04-host-overrides.md`).

## i18n

Out of scope for v1. All strings are English. The provider hook leaves room for translation without code changes.
