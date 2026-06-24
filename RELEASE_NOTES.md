# Marco Chrome Extension v4.3.0

## Changed

- **📋 Plan inline strip — one-click presets.** The highlighted preset
  numbers (5, 10, 12, 15, 30) render directly in the strip and
  **clicking a number immediately appends `Plan ${N}`** to the chat
  box. No more "type a number → click Plan" two-step.

- **`More ▴` drop-up.** A new drop-up button opens a 6-column grid of
  every plan size (5 through 200). Clicking a number appends the plan
  and auto-closes the panel. Click outside to dismiss.

- The redundant Plan steps `<input>` was removed — the preset buttons
  and drop-up are the only entry points.

## Internal

- Version pins bumped 4.2.0 → 4.3.0 across all manifests,
  `instruction.ts` files, `shared-state.ts`, the prompts bundle
  metadata, and the root readme.

## Verification

- Open Lovable → Plan strip shows: `📋 Plan · click a number to add ·
  [5] [10] [12] [15] [30] · More ▴`.
- Click `[10]` → toast confirms `Plan 10` appended to chat box.
- Click `More ▴` → drop-up appears above with all sizes; click `45` →
  appends and closes.
