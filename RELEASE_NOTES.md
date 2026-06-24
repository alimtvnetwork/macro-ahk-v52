# Marco Chrome Extension v4.2.0

## Changed

- **Inline chat strips reordered** to match the natural workflow:
  - 📋 **Plan** (top)
  - ▶ **Next** (middle)
  - 🔁 **Repeat** (bottom, closest to the chat box)

  The previous Next-on-top / Plan-below layout was confusing. Action
  buttons now stay right-aligned in a consistent vertical stack.

- **Root `readme.md`** install snippets and pinned-version badges
  bumped from `v4.0.0` → `v4.2.0`.

## Internal

- Version pins moved 4.1.0 → 4.2.0 across `version.json`,
  `manifest.json`, `src/shared/constants.ts`, every
  `standalone-scripts/**/instruction.ts`, `shared-state.ts`,
  `payment-banner-hider/src/index.ts`, and the prompts bundle metadata.

## Verification

- Manual: open Lovable — the strips above the chat box now render as
  Plan / Next / Repeat top-to-bottom, all three action buttons
  right-aligned.
