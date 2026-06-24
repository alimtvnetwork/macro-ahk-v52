/**
 * Persistent per-project task queue.
 *
 * Plan: .lovable/plans/pending/08-task-splitter-and-next-queue.md (step 3).
 *
 * Storage is injected via a `QueueStorage` adapter so the queue can be
 * unit-tested without IndexedDB. The production wiring uses
 * `ProjectKvStore` section `task_queue`; tests inject an in-memory map.
 *
 * Sequential fail-fast per mem://constraints/no-retry-policy. Every
 * catch routes through the namespace logger (caller-supplied) — this
 * module surfaces errors by throwing, never by swallowing.
 */

export interface TaskQueueItem {
    readonly id: string;
    readonly text: string;
    status: "pending" | "active" | "done" | "failed";
    readonly createdAt: number;
}

export interface TaskQueueRecord {
    items: TaskQueueItem[];
    updatedAt: number;
}

export interface QueueStorage {
    read(projectId: string): Promise<TaskQueueRecord | null>;
    write(projectId: string, record: TaskQueueRecord): Promise<void>;
}

export const DEFAULT_MAX_QUEUE_SIZE = 50;

const newId = (): string =>
    `tq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const emptyRecord = (): TaskQueueRecord => ({ items: [], updatedAt: Date.now() });

const readOrEmpty = async (storage: QueueStorage, projectId: string): Promise<TaskQueueRecord> => {
    const record = await storage.read(projectId);
    return record ?? emptyRecord();
};

export interface EnqueueOptions {
    readonly maxQueueSize?: number;
}

export const createTaskQueue = (storage: QueueStorage) => {
    const enqueueMany = async (
        projectId: string,
        texts: readonly string[],
        options: EnqueueOptions = {},
    ): Promise<TaskQueueItem[]> => {
        const max = options.maxQueueSize ?? DEFAULT_MAX_QUEUE_SIZE;
        const record = await readOrEmpty(storage, projectId);
        const room = max - record.items.length;
        if (room <= 0) {
            throw new Error(
                `TaskQueueFull: projectId=${projectId} size=${record.items.length} max=${max}`,
            );
        }
        const accepted = texts.slice(0, room).map((text): TaskQueueItem => ({
            id: newId(),
            text,
            status: "pending",
            createdAt: Date.now(),
        }));
        record.items.push(...accepted);
        record.updatedAt = Date.now();
        await storage.write(projectId, record);
        return accepted;
    };

    const peek = async (projectId: string): Promise<TaskQueueItem | null> => {
        const record = await readOrEmpty(storage, projectId);
        return record.items.find((item) => item.status === "pending") ?? null;
    };

    const dequeue = async (projectId: string): Promise<TaskQueueItem | null> => {
        const record = await readOrEmpty(storage, projectId);
        const idx = record.items.findIndex((item) => item.status === "pending");
        if (idx === -1) {
            return null;
        }
        const [item] = record.items.splice(idx, 1);
        record.updatedAt = Date.now();
        await storage.write(projectId, record);
        return item;
    };

    const clear = async (projectId: string): Promise<void> => {
        await storage.write(projectId, emptyRecord());
    };

    const count = async (projectId: string): Promise<number> => {
        const record = await readOrEmpty(storage, projectId);
        return record.items.filter((item) => item.status === "pending").length;
    };

    return { enqueueMany, peek, dequeue, clear, count };
};

export type TaskQueue = ReturnType<typeof createTaskQueue>;
