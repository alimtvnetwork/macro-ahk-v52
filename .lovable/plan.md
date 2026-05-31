# v3.49.0 Roadmap: Advanced Prompt Library & Execution Monitoring

This update focuses on scaling the prompt management system and providing deeper visibility into the automated execution pipeline.

### 1. Folder-based Prompt Organization
- **Nested Categories**: Support for "Folder/Subfolder" naming in categories.
- **Tree View**: The Prompts dropdown will render categories as collapsible folders for a cleaner hierarchical structure.

### 2. Live Task Execution Stream
- **Execution Log**: A new "Live Stream" tab in the Task Queue modal showing real-time console-style output of the active task's progress.
- **Progress Snapshots**: Captured DOM states at the moment of failure for easier debugging.

### 3. Smart Prompt Suggestions
- **Contextual Prompts**: A new "Suggested" category that surfaces prompts based on the current project's tags or recent activity.
- **Auto-Tagging**: Prompts are automatically tagged based on their content (e.g., "UI", "Fix", "Feature").

### 4. Version Sync & Infrastructure
- **Version Bump**: Sync all manifests and constants to `v3.49.0`.
- **Worker Hardening**: Improved error boundary handling in the task runner to prevent single-task failures from wedging the entire loop.

## Technical Details
- **UI Components**:
  - Implement a recursive folder renderer in `prompt-dropdown.ts`.
  - Add `ExecutionStreamViewer` component to `macro-ui.ts`.
- **Logic**:
  - Extend `prompt-utils.ts` with basic keyword-based auto-tagging logic.
  - Refactor `TaskQueueManager` to emit structured execution events for the live stream.
