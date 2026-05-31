The goal is to implement a robust Task Queue system for prompt submissions with a customizable 30-second delay, retry logic on failure, persistence via SQLite/IndexedDB, and UI improvements (fixing existing bugs in the Plan and Filter buttons).

### Technical Overview

1.  **Settings Extension**:
    *   Add `nextSubmissionDelaySeconds` (default 30).
    *   Add `enableNextSubmissionDelay` (toggle).
    *   Add `retryOnFailure` (toggle).
    *   Add `creditPollIntervalSeconds` (default 5).

2.  **Task Queue Architecture**:
    *   **States**: `pending`, `active`, `completed`, `failed`, `hold`.
    *   **Storage**: 
        *   **Local (IndexedDB)**: `ProjectKvStore` for immediate persistence of every task to survive accidental reloads.
        *   **Global (SQLite)**: `marco.kv` for project-scoped historical storage and cross-session persistence.
    *   **Logic**: A singleton queue manager will handle the delay timer and sequence execution.

3.  **UI Updates**:
    *   **Hamburger Menu**: Add a "Task Queue" section to view pending and recently completed tasks.
    *   **Settings Modal**: Add sliders and toggles for the new timing and retry options.
    *   **Prompt Dropdown**: Fix the Plan button and Filter menu rebinding issues.
    *   **IO Dialog**: Add the final Import/Export trigger.

4.  **Submission Flow**:
    *   Instead of direct injection, prompts are pushed to the queue.
    *   The queue processor checks for the `enableNextSubmissionDelay` setting.
    *   If enabled, it waits for `nextSubmissionDelaySeconds` before processing the next item.
    *   Displays a countdown timer in the UI during the delay.

### 20-Step Implementation Plan

1.  **[TASK] Write Detailed Spec**: Document data structures, API contracts, and UI states.
2.  **[TASK] Settings Store Expansion**: Add new delay, retry, and polling keys to `SettingsOverrides`.
3.  **[TASK] Settings UI Sliders**: Implement sliders and toggles in `settings-ui.ts` for the new keys.
4.  **[TASK] Fix Filter Menu**: Rebind filter menu listeners in `prompt-dropdown.ts` snapshot path.
5.  **[TASK] Fix Plan Button**: Ensure Plan button listeners are correctly rebound and functional.
6.  **[TASK] Task Queue Model**: Create types and interfaces for the queue entries.
7.  **[TASK] Task Queue Manager (Core)**: Implement the singleton processor with delay logic.
8.  **[TASK] IndexedDB Persistence**: Implement immediate saving of queue state to `ProjectKvStore`.
9.  **[TASK] SQLite Sync**: Implement background persistence of the queue to SQLite (`marco.kv`).
10. **[TASK] Queue UI Shell**: Create the "Task Queue" panel/modal.
11. **[TASK] Hamburger Menu Integration**: Add the trigger for Task Queue in the main menu.
12. **[TASK] Re-injection Prompt**: Add startup check for pending tasks and "Do you want to re-inject?" dialog.
13. **[TASK] Timer/Countdown Component**: Create a visual timer to show delay progress.
14. **[TASK] Retry Logic**: Implement detection of failed submissions and "hold" state.
15. **[TASK] Customizable Credit Polling**: Wire `creditPollIntervalSeconds` to the credit-polling logic.
16. **[TASK] Import/Export Trigger**: Add the final button to the prompts section.
17. **[TASK] Task Queue Management (Pause/Clear)**: Add control buttons to the Task Queue UI.
18. **[TASK] SQLite Table for Prompts**: Ensure project-specific prompt history table exists.
19. **[TASK] Bug Hunt & Regression Testing**: Verify all buttons (Plan, Filter, Load) work after multiple renders.
20. **[TASK] Documentation & Version Bump**: Finalize docs and bump to **v3.44.0**.

### Technical Details (For Developer)
- **Task Queue Key**: `MacroTaskQueue:{projectId}` in SQLite.
- **IndexedDB Store**: `task_queue` section in `ProjectKvStore`.
- **Fail Detection**: Check for specific error message DOM elements or XPath failure during injection.
- **Delay implementation**: `await new Promise(r => setTimeout(r, delayMs))` in the queue loop, with a cancellable signal.
