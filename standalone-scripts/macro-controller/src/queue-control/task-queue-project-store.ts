/** Production ProjectKvStore adapter for the splitter-produced Next queue. */

import { getProjectKvStore } from "../project-kv-store";
import { getDisplayProjectName, getProjectIdFromUrl } from "../logging";
import { createTaskQueue, type QueueStorage, type TaskQueueRecord } from "./task-queue";

const DB_PROJECT_NAME = "macro-controller";
const QUEUE_SECTION = "task_queue";
const QUEUE_KEY_PREFIX = "splitter_next_queue_";

function queueKey(projectId: string): string {
    return QUEUE_KEY_PREFIX + projectId;
}

export function resolveTaskQueueProjectId(): string {
    return getProjectIdFromUrl() || getDisplayProjectName();
}

function createProjectQueueStorage(): QueueStorage {
    const store = getProjectKvStore(DB_PROJECT_NAME);

    return {
        read(projectId: string): Promise<TaskQueueRecord | null> {
            return store.get<TaskQueueRecord>(QUEUE_SECTION, queueKey(projectId));
        },
        write(projectId: string, record: TaskQueueRecord): Promise<void> {
            return store.set(QUEUE_SECTION, queueKey(projectId), record);
        },
    };
}

export function getPersistentTaskQueue() {
    return createTaskQueue(createProjectQueueStorage());
}