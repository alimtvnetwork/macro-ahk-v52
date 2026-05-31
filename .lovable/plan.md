I will implement the remaining tasks for the macro-controller v3.43.0/v3.44.0 roadmap, focusing on UI refinements, task queue management, and startup safety.

### 1. Task Queue UI Enhancements
- Add **Retry Failed** button to `buildTaskQueueSection` in `macro-ui.ts`. This will update all 'failed' tasks back to 'pending'.
- Add **Clear All** button to `buildTaskQueueSection`.
- Improve the layout of the Task Queue header to accommodate more buttons without clutter.

### 2. Startup Pending-Task Interactivity
- Replace the passive toast in `startup.ts` with a more prominent re-injection dialog when pending tasks are detected.
- The dialog will show the count of pending tasks and offer "Resume Now" or "Keep Paused" options.
- Ensure this only triggers if the queue isn't already processing (safety check).

### 3. Verify and Fix Plan/Filter Rebinding
- Audit `_rebindDropdownListeners` in `prompt-dropdown.ts` to ensure it correctly identifies and re-binds the Filter and Plan Task rows, especially when they are restored from an IndexedDB snapshot.
- Fix a potential issue in `_rebindFilterMenu` where it might not correctly replace the item if the DOM structure shifted slightly.

### 4. Cleanup and Version Bump
- Final pass on documentation (README) to reflect Task Queue features.
- Bump version to v3.44.0.

**Technical Details:**
- **File edits**: `macro-ui.ts`, `task-queue.ts`, `startup.ts`, `prompt-dropdown.ts`.
- **Task Queue**: New helper `retryFailedTasks()` in `task-queue.ts`.
- **Startup**: New `showStartupResumeDialog()` function in `startup.ts` or a new UI helper file.
- **Rebinding**: Strengthen `_rebindFilterMenu` selectors to use more robust data attributes.
