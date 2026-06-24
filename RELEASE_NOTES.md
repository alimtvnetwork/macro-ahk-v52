# Marco Chrome Extension v4.4.0

## Changed

- **Collapse chevrons on inline strips.** The 📋 Plan and ▶ Next
  strips above the chat box now show a ▾/▸ chevron on the right edge.
  Click the chevron — or the strip label — to collapse/expand. State
  persists across reloads in `localStorage` under
  `marco-next-inline-prefs` (`planCollapsed`, `nextCollapsed`).

## Internal

- Version pins bumped 4.3.0 → 4.4.0 across `version.json`,
  `manifest.json`, `src/shared/constants.ts`, all
  `standalone-scripts/**/instruction.ts`, `shared-state.ts`,
  `payment-banner-hider/src/index.ts`, and the prompts bundle metadata.
