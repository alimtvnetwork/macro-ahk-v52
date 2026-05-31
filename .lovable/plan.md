## Phase v3.45.0: Prompt IO Hardening & Task Queue Polish

The v3.45.0 roadmap focuses on closing out the Prompt IO feature (Issue 131), adding regression tests, and polishing the Task Queue UI for better observability and control.

### 1. Close out Prompt IO (Issue 131)
- **Clear All prompts**: Add a destructive "Clear All Prompts" button to the IO dialog with a confirmation prompt.
- **Merge Strategy UI**: Add a simple checkbox "Overwrite existing" (defaults to true) in the IO dialog.
- **Regression Tests**: Create `standalone-scripts/macro-controller/src/__tests__/prompt-io.test.ts` covering JSON validation, slug-based matching, and merge strategies.

### 2. Task Queue UI & Logic Polish
- **Queue Count Header**: Update the Task Queue panel header to show `(N pending)` in real-time.
- **Pause on Error**: Add a setting in the UI to toggle "Auto-pause queue on failure".
- **Clear All UI hint**: Ensure the right-click "Clear All" hint on the Clear button is visible or documented in a tooltip.
- **Max Retries Config**: Add a numeric input for "Max Retries" in the settings panel (currently hardcoded to 3).

### 3. Documentation & Versioning
- **Changelog Sync**: Sync `changelog.md` with v3.44.0 and v3.45.0 changes.
- **Readme & Manifest**: Bump unified version to v3.45.0.

### Technical Details
- Use `PromptCacheKey.Store` for total reset logic.
- Extend `MacroTask` or `TaskQueueState` if needed for new settings, or use `settings-store.ts`.
- Ensure all new UI elements use the established `cPrimary`, `cPanelBg`, etc. variables.
- Update `manifest.json`, `src/shared/constants.ts`, and `standalone-scripts/*/src/instruction.ts` for version sync.
