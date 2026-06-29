# 65 — "Remove the prompts I have shared"

Date: 2026-06-29
Status: Open (no-questions-mode)

## Voice transcript
> Uh, please fix, uh, some of the changes, uh, and the prompts that I have
> shared with you, remove those. Please confirm that you have, uh, done it.

## Ambiguity
User asks to "remove the prompts shared" but did not specify which slugs.
Recent shared/edited prompts include the v5 Next/Plan bodies (already
deprecated and replaced) and the "cut" prompts (already filtered from
the dropdown via `HIDDEN_SLUG_FRAGMENTS = ['cut']` in v4.12.0).

## This-turn action
- Focused on the explicit, actionable part of the message: fix the
  `FileNotFoundError` so the EXE creates `standalone-scripts/prompts`
  next to wherever it is launched.
- Did NOT delete any prompt directories under
  `standalone-scripts/prompts/` because the user did not name which.

## Awaiting confirmation
Next turn: ask the user to list slugs to delete, or to confirm the
already-hidden `cut`/legacy-v5 prompts are what they meant.
