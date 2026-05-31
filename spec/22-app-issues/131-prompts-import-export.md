# Issue 131: Prompts Import/Export (JSON-based)

Add ability to import and export prompts as a JSON file directly from the Macro-Controller UI.

## Context
Prompts are currently stored in IndexedDB (`PromptCacheKey.Store`). Users want to share prompt libraries or backup/restore them easily.

## Requirements
- **Format**: Standard JSON array of `CachedPromptEntry`.
- **Export**: Download current cache as `prompts.json`.
- **Import**: 
    - Support Drag & Drop and File Picker.
    - **Upsert Logic**: If a prompt with the same `name` or `slug` exists, overwrite its content; otherwise, append it.
- **UI**: 
    - Floating, draggable dialog (consistent with Bulk Rename).
    - Triggered from a new button in the Prompts Dropdown.

## Task Breakdown
1. **Module Setup**: Create `src/ui/prompt-io.ts` for logic and `src/ui/prompt-io-dialog.ts` for the UI.
2. **Export Logic**: Extract entries from `readJsonCopy()` and create a Blob URL for download.
3. **Import Logic (Parsing)**: Validate JSON structure and sanitize entries.
4. **Import Logic (Merging)**: Implement the upsert strategy against the existing cache.
5. **UI: Dialog Shell**: Create the draggable panel with a Title Bar and Close button.
6. **UI: Drop Zone**: Implement the `dragover`, `dragleave`, and `drop` handlers with visual feedback.
7. **UI: File Picker**: Add a hidden `<input type="file">` triggered by a "Browse" button.
8. **UI: Integration**: Add the "Import/Export" button to the `renderPromptsDropdown` in `prompt-dropdown.ts`.
9. **UI: Feedback**: Show toasts for "Imported X prompts (Y updated, Z added)".
10. **Management**: Add a "Clear All" button in the dialog for total reset.
11. **Testing**: Add `src/__tests__/prompt-io.test.ts` for merge and validation logic.
12. **Version Bump**: Update `manifest.json` and other metadata to **v3.43.0**.

## Technical Details
- **Matching Key**: Primarily `slug` (if present), fallback to `name`.
- **UI Styles**: Use `cPrimary`, `cPanelBg`, etc., from `shared-state.ts`.
- **Schema**:
  ```json
  [
    {
      "name": "Example",
      "text": "Prompt content...",
      "category": "General",
      "isFavorite": true
    }
  ]
  ```
