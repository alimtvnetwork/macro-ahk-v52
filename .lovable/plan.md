# v3.48.0 Roadmap: Advanced Task Operations & UI Polishing

This update focuses on deepening the Task Queue functionality and refining the prompt management experience.

### 1. Task Bulk Actions
- **Bulk Selection**: Multi-select mode for the Task Queue (Active and History).
- **Batch Actions**: Delete selected, Move to History, or Re-queue (from history) in a single click.

### 2. Prompt Quick-Editor
- **Inline Editing**: Click a prompt name while holding `Alt` to instantly edit its title and text without opening a full modal.
- **Auto-Save**: Changes are persisted to the extension backend immediately.

### 3. Queue Performance & Reliability
- **Background Worker**: Offload queue status updates to a dedicated background loop to prevent UI lag during high-frequency submissions.
- **Enhanced Failure Recovery**: Automatic detection of session timeouts with a "Re-auth & Resume" shortcut.

### 4. Version Sync & Polish
- **Version Bump**: Sync all manifests and constants to `v3.48.0`.
- **UI Consistency**: Standardize hover effects and transition durations across all panels.

## Technical Details
- **Task Logic**: Extend `task-queue.ts` with `batchDeleteTasks(ids[])` and `batchRetryTasks(ids[])`.
- **UI Components**:
  - Update `macro-ui.ts` with checkbox support in the task list.
  - Implement `InlinePromptEditor` in `prompt-dropdown.ts`.
- **State Management**: Refactor `TaskQueueManager` to improve thread-safety between UI and background processing.
