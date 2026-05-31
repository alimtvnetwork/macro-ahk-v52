# v3.47.0 Roadmap: Dynamic Variables & Prompt Favorites

This update introduces interactive prompt variables and a favoriting system to streamline complex workflows and improve prompt organization.

### 1. Dynamic Prompt Variables
- **Interactive Input**: Support for `{{?Variable Name}}` syntax in prompts.
- **Input Dialog**: Clicking a prompt with dynamic variables will open a small modal to fill in the values before injection.
- **Auto-Replacement**: Values are injected into the final prompt text.

### 2. Prompt Favorites & Pinning
- **Favorite Toggle**: Add a star icon to prompt items to toggle favorite status.
- **Priority List**: Favorites will automatically appear in a dedicated "⭐ Favorites" category at the top of the dropdown.

### 3. Task Inspection
- **Detail View**: Click on any task in the Queue or History to view its full prompt text and detailed status/error logs in a modal.

### 4. Version Sync & Polish
- **Version Bump**: Sync all manifests and constants to `v3.47.0`.
- **UI Tweaks**: Improved category headers and "Empty" state messages.

## Technical Details
- **Variable Logic**: New `resolveDynamicVariables(text): Promise<string>` helper in `prompt-utils.ts`.
- **UI Components**:
  - Update `prompt-dropdown.ts` to render the star icon and "Favorites" category.
  - New `prompt-variable-modal.ts` for gathering variable inputs.
  - Update `macro-ui.ts` to handle task clicks for the inspection modal.
- **Persistence**: `PromptEntry` already has `isFavorite`, so we just need to hook it up to the `SAVE_PROMPT` message.
