import { describe, it, expect, beforeEach } from "vitest";
import {
    createTaskQueue,
    DEFAULT_MAX_QUEUE_SIZE,
    type QueueStorage,
    type TaskQueueRecord,
} from "../queue-control/task-queue";

const makeMemoryStorage = (): QueueStorage => {
    const store = new Map<string, TaskQueueRecord>();
    return {
        read: async (projectId) => {
            const rec = store.get(projectId);
            if (!rec) return null;
            // deep clone to mimic IndexedDB serialisation
            return JSON.parse(JSON.stringify(rec)) as TaskQueueRecord;
        },
        write: async (projectId, record) => {
            store.set(projectId, JSON.parse(JSON.stringify(record)) as TaskQueueRecord);
        },
    };
};

describe("task-queue", () => {
    let queue: ReturnType<typeof createTaskQueue>;
    const projectId = "proj-A";

    beforeEach(() => {
        queue = createTaskQueue(makeMemoryStorage());
    });

    it("starts empty", async () => {
        expect(await queue.count(projectId)).toBe(0);
        expect(await queue.peek(projectId)).toBeNull();
        expect(await queue.dequeue(projectId)).toBeNull();
    });

    it("enqueueMany + count + peek + dequeue round-trip in FIFO order", async () => {
        const added = await queue.enqueueMany(projectId, ["one", "two", "three"]);
        expect(added).toHaveLength(3);
        expect(await queue.count(projectId)).toBe(3);

        const head = await queue.peek(projectId);
        expect(head?.text).toBe("one");
        expect(await queue.count(projectId)).toBe(3); // peek does NOT consume

        const first = await queue.dequeue(projectId);
        expect(first?.text).toBe("one");
        expect(await queue.count(projectId)).toBe(2);

        const second = await queue.dequeue(projectId);
        expect(second?.text).toBe("two");
    });

    it("scopes items per projectId", async () => {
        await queue.enqueueMany("A", ["a1", "a2"]);
        await queue.enqueueMany("B", ["b1"]);
        expect(await queue.count("A")).toBe(2);
        expect(await queue.count("B")).toBe(1);
        const popped = await queue.dequeue("A");
        expect(popped?.text).toBe("a1");
        expect(await queue.count("B")).toBe(1);
    });

    it("clear empties the queue", async () => {
        await queue.enqueueMany(projectId, ["x", "y"]);
        await queue.clear(projectId);
        expect(await queue.count(projectId)).toBe(0);
        expect(await queue.dequeue(projectId)).toBeNull();
    });

    it("rejects enqueue when at max size", async () => {
        const small = 3;
        await queue.enqueueMany(projectId, ["a", "b", "c"], { maxQueueSize: small });
        await expect(
            queue.enqueueMany(projectId, ["d"], { maxQueueSize: small }),
        ).rejects.toThrow(/TaskQueueFull/);
    });

    it("truncates the batch to remaining room rather than rejecting partial", async () => {
        await queue.enqueueMany(projectId, ["a", "b"], { maxQueueSize: 4 });
        const accepted = await queue.enqueueMany(
            projectId,
            ["c", "d", "e", "f"],
            { maxQueueSize: 4 },
        );
        expect(accepted).toHaveLength(2);
        expect(await queue.count(projectId)).toBe(4);
    });

    it("default max size is the published constant", () => {
        expect(DEFAULT_MAX_QUEUE_SIZE).toBe(50);
    });
});
