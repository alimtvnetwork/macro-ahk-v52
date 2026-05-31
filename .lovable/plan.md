# v3.46.0 Roadmap: Task History, Search & Reordering

This update focuses on Task Queue organization and Prompt discoverability, introducing a dedicated task history and improved queue management.

### 1. Task Queue Enhancements
- **Task History**: Completed tasks will now be moved to a separate history list (persisted in IndexedDB) rather than staying in the main pending list.
- **Queue Reordering**: Add "Move Up" and "Move Down" controls to pending tasks, allowing users to prioritize urgent prompts.
- **Completed/Failed Filter**: The Task Queue UI will now feature tabs: **Active** (Pending/Hold) and **History** (Completed/Failed).

### 2. Prompt Management
- **Search Bar**: A new search input at the top of the Prompts panel to filter saved prompts by title or content.
- **Prompt Tagging**: Support for optional `tags` in prompt definitions, searchable via the new filter.
- **Tag UI**: Render small colored tags beneath prompt titles in the list.

### 3. Polish & Synchronization
- **Version Bump**: Sync all manifests and constants to `v3.46.0`.
- **UI Consistency**: Ensure history items are styled as "muted" to distinguish from active tasks.

## Technical Details
- **State Changes**: Update `TaskQueueState` in `task-queue.ts` to include a `history` array.
- **Persistence**: Refactor `saveTaskQueue` to handle the new history structure.
- **UI Components**: 
  - Update `macro-ui.ts` to implement the Tab switcher in the Task Queue.
  - Add search logic to `prompt-dropdown.ts` or `macro-ui.ts` depending on where the list is rendered.
- **Logic**: Add `reorderTask` helper to `task-queue.ts`.
- **Files**: `manifest.json`, `standalone-scripts/macro-controller/src/task-queue.ts`, `standalone-scripts/macro-controller/src/ui/macro-ui.ts`, `standalone-scripts/*/src/instruction.ts`, etc.
